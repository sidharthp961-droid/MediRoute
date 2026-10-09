// ─── Emergency Report Validation & Lightweight Risk Engine ───

import crypto from 'crypto';
import { Coordinates, EmergencyCategory, EmergencyReport } from './types';
import { isValidCoordinates, haversineDistance } from './geofence';

export const ALLOWED_CATEGORIES: EmergencyCategory[] = [
  'cardiac',
  'accident',
  'maternal',
  'respiratory',
  'trauma',
  'stroke',
  'other',
];

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PHOTO_DATA_URL_LENGTH = Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 200;

import dotenv from 'dotenv';
dotenv.config();

export const KERALA_BOUNDS = {
  minLat: 8.0,
  maxLat: 13.0,
  minLng: 74.8,
  maxLng: 77.8,
};

/**
 * Retrieves the configured moderator secret key strictly from process.env.MODERATOR_KEY.
 * Does NOT provide any hardcoded default fallback.
 * Returns undefined if MODERATOR_KEY is missing or empty.
 */
export function getModeratorKey(): string | undefined {
  const key = process.env.MODERATOR_KEY;
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return undefined;
  }
  return key.trim();
}

/**
 * Validates a submitted moderator key against process.env.MODERATOR_KEY.
 * Fails safely (returns false) if MODERATOR_KEY is not configured in the environment.
 */
export function isAuthorizedModerator(providedKey?: string | null): boolean {
  const configuredKey = getModeratorKey();
  if (!configuredKey) {
    // Fail safely: If MODERATOR_KEY is not configured, reject all authorization attempts
    return false;
  }
  if (!providedKey || typeof providedKey !== 'string') {
    return false;
  }
  return providedKey.trim() === configuredKey;
}

/**
 * Accessor for the active moderator secret read from process.env.MODERATOR_KEY only.
 * No hardcoded fallback.
 */
export const MODERATOR_SECRET = process.env.MODERATOR_KEY?.trim() || undefined;

export const RISK_DISCLAIMER =
  'Automated risk flags support human review and do not conclusively determine whether a report is genuine or fake.';

/**
 * Strips internal tracking identifiers (session ID, photo hash) before public broadcast.
 * Never exposes private vehicle registration numbers.
 */
export function getPublicReport(report: EmergencyReport) {
  const { reporterSessionId, photoHash, ...rest } = report;
  return rest;
}

/**
 * Validate submitted photo data URL or URL.
 * Checks MIME type, size, and computes a SHA-256 fingerprint.
 */
export function validateAndFingerprintPhoto(photoUrl?: string): {
  valid: boolean;
  error?: string;
  hash?: string;
} {
  if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') {
    return { valid: true };
  }

  const trimmed = photoUrl.trim();

  // If base64 data URL
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:image\/(jpeg|jpg|png|webp);base64,/i);
    if (!match) {
      return {
        valid: false,
        error: 'Invalid file format: only JPEG, PNG, and WebP images are permitted',
      };
    }

    if (trimmed.length > MAX_PHOTO_DATA_URL_LENGTH) {
      return {
        valid: false,
        error: 'Image exceeds maximum permitted size of 5 MB',
      };
    }

    // Compute SHA-256 fingerprint of base64 content
    const base64Data = trimmed.substring(trimmed.indexOf(',') + 1);
    const hash = crypto.createHash('sha256').update(base64Data).digest('hex');
    return { valid: true, hash };
  }

  // If standard HTTP URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const hash = crypto.createHash('sha256').update(trimmed).digest('hex');
    return { valid: true, hash };
  }

  return {
    valid: false,
    error: 'Invalid photo payload: must be a valid image data URL or web link',
  };
}

export interface RiskAnalysisResult {
  riskScore: number;
  riskFlags: string[];
  riskNotes: string[];
  isUrgentReview: boolean;
}

/**
 * Evaluate lightweight, explainable risk checks on a submitted report against
 * existing reports and session history.
 */
export function analyzeReportRisk(
  newReport: {
    category: EmergencyCategory;
    description: string;
    location: Coordinates;
    photoHash?: string;
    reporterSessionId: string;
    timestamp: number;
  },
  existingReports: EmergencyReport[],
  sessionSubmissionCount: number,
): RiskAnalysisResult {
  const flags: string[] = [];
  const notes: string[] = [];
  let score = 0;

  // 1. Geographic bounds check (Kerala priority corridors)
  const isInsideKerala =
    newReport.location.lat >= KERALA_BOUNDS.minLat &&
    newReport.location.lat <= KERALA_BOUNDS.maxLat &&
    newReport.location.lng >= KERALA_BOUNDS.minLng &&
    newReport.location.lng <= KERALA_BOUNDS.maxLng;

  if (!isInsideKerala) {
    flags.push('outside_kerala_corridor');
    notes.push(
      `Location (${newReport.location.lat.toFixed(4)}, ${newReport.location.lng.toFixed(4)}) is outside Kerala priority corridors.`,
    );
    score += 20;
  }

  // 2. Proximity duplicate detection (< 500m & within 30 min)
  const recentWindow = 30 * 60 * 1000;
  for (const existing of existingReports) {
    if (existing.status === 'REJECTED') continue;
    const age = newReport.timestamp - existing.timestamp;
    if (age >= 0 && age <= recentWindow) {
      const distance = haversineDistance(newReport.location, existing.location);
      if (distance <= 500 && existing.category === newReport.category) {
        flags.push('duplicate_suspected');
        const minsAgo = Math.max(1, Math.round(age / 60000));
        notes.push(
          `Similar ${newReport.category} report found ${Math.round(distance)}m away (${minsAgo}m ago).`,
        );
        score += 25;

        // Check if from same session
        if (existing.reporterSessionId === newReport.reporterSessionId) {
          flags.push('same_session_resubmission');
          notes.push(
            'Repeated submission from same session detected — not counted as independent corroboration.',
          );
          score += 15;
        }
        break;
      }
    }
  }

  // 3. Repeated identical image upload detection
  if (newReport.photoHash) {
    for (const existing of existingReports) {
      if (existing.photoHash === newReport.photoHash && existing.id !== (newReport as any).id) {
        flags.push('duplicate_image_detected');
        notes.push(
          `Photo fingerprint matches report #${existing.id.slice(0, 8)}. Potential re-used image.`,
        );
        score += 35;
        break;
      }
    }
  }

  // 4. Rate-limiting velocity check
  if (sessionSubmissionCount > 3) {
    flags.push('rate_limit_exceeded');
    notes.push(
      `High submission velocity: ${sessionSubmissionCount} reports from this session in the last 10 minutes.`,
    );
    score += 30;
  }

  // 5. Urgent review triage check
  const criticalCategories: EmergencyCategory[] = ['cardiac', 'maternal', 'stroke', 'trauma'];
  const urgentKeywords = ['unconscious', 'critical', 'bleeding', 'cardiac arrest', 'trauma', 'severe', 'seizure', 'accident'];
  const descLower = newReport.description.toLowerCase();
  const hasUrgentKeyword = urgentKeywords.some((kw) => descLower.includes(kw));
  const isUrgentReview = criticalCategories.includes(newReport.category) || hasUrgentKeyword;

  if (isUrgentReview) {
    notes.push('Flagged for urgent review due to critical condition markers.');
  }

  return {
    riskScore: Math.min(100, score),
    riskFlags: Array.from(new Set(flags)),
    riskNotes: notes,
    isUrgentReview,
  };
}
