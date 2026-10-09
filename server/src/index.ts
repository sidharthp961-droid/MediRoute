// ─── MediRoute server entry point ───

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './socket';
import { ClientToServerEvents, ServerToClientEvents } from './types';

import { state } from './state';
import { isValidCoordinates } from './geofence';
import { isValidRegistration, formatRegistration } from './validation';
import {
  ALLOWED_CATEGORIES,
  isAuthorizedModerator,
  validateAndFingerprintPhoto,
  analyzeReportRisk,
  getPublicReport,
} from './reportValidation';
import { EmergencyReport, Vehicle } from './types';
import { v4 as uuid } from 'uuid';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Socket.IO with permissive CORS for LAN development
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 20_000,
  pingInterval: 10_000,
});

setupSocketHandlers(io);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// ─── Role-Aware Authentication Endpoints (Phase 1) ───

// Authenticate either private driver or administrator
app.post('/api/auth/login', (req, res) => {
  const { role, name, phone, registrationNumber, key } = req.body || {};

  if (!role || (role !== 'driver' && role !== 'admin')) {
    return res.status(400).json({
      error: "Invalid role specified. Supported roles are 'driver' and 'admin'",
    });
  }

  if (role === 'admin') {
    if (!isAuthorizedModerator(key)) {
      return res.status(401).json({
        error: 'Invalid or missing administrator authorization key',
      });
    }

    const adminName =
      name && typeof name === 'string' && name.trim().length > 0
        ? name.trim()
        : 'System Administrator';

    return res.json({
      success: true,
      user: {
        role: 'admin',
        name: adminName,
      },
      token: key,
    });
  }

  // Driver role
  const driverName =
    name && typeof name === 'string' && name.trim().length > 0
      ? name.trim()
      : 'Private Driver';

  let formattedReg: string | undefined = undefined;
  if (registrationNumber && typeof registrationNumber === 'string' && registrationNumber.trim().length > 0) {
    if (!isValidRegistration(registrationNumber)) {
      return res.status(400).json({
        error: 'Invalid vehicle registration plate format (e.g., KL 07 CA 1234)',
      });
    }
    formattedReg = formatRegistration(registrationNumber);
  }

  return res.json({
    success: true,
    user: {
      role: 'driver',
      name: driverName,
      phone: phone && typeof phone === 'string' ? phone.trim() : undefined,
      registrationNumber: formattedReg,
    },
  });
});

// Verify administrator session token
app.get('/api/auth/verify', (req, res) => {
  const modKey = (req.headers['x-moderator-key'] as string) || (req.query?.key as string);
  if (isAuthorizedModerator(modKey)) {
    return res.json({ role: 'admin', authenticated: true });
  }
  return res.status(401).json({ error: 'Unauthenticated or invalid administrator key' });
});

// ─── Emergency Reports REST Endpoints (Phase 5) ───

// List public reports (internal session & hashes stripped, private registration numbers never exposed)
app.get('/api/reports', (_req, res) => {
  res.json({ reports: state.getAllReportsPublic() });
});

// Submit community emergency report
app.post('/api/reports', (req, res) => {
  const data = req.body;
  if (!data || !ALLOWED_CATEGORIES.includes(data.category)) {
    return res.status(400).json({ error: 'Valid emergency category is required' });
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 5) {
    return res.status(400).json({ error: 'Description must be at least 5 characters' });
  }

  if (!isValidCoordinates(data.location)) {
    return res.status(400).json({ error: 'Invalid or missing incident coordinates' });
  }

  const photoCheck = validateAndFingerprintPhoto(data.photoUrl);
  if (!photoCheck.valid) {
    return res.status(400).json({ error: photoCheck.error || 'Invalid photo format' });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const velocity = state.recordSubmissionVelocity(clientIp);
  if (velocity > 5) {
    return res.status(429).json({
      error: 'Rate limit exceeded: too many reports submitted from this session in 10 minutes',
    });
  }

  const existingReports = Array.from(state.reports.values());
  const risk = analyzeReportRisk(
    {
      category: data.category,
      description: data.description.trim(),
      location: data.location,
      photoHash: photoCheck.hash,
      reporterSessionId: clientIp,
      timestamp: data.clientTimestamp || Date.now(),
    },
    existingReports,
    velocity,
  );

  const report: EmergencyReport = {
    id: uuid(),
    category: data.category,
    description: data.description.trim(),
    location: data.location,
    locationAddress: data.locationAddress,
    locationSource: data.locationSource || 'gps',
    photoUrl: data.photoUrl,
    photoHash: photoCheck.hash,
    timestamp: data.clientTimestamp || Date.now(),
    status: 'PENDING', // STRICT DEFAULT TO PENDING
    reporterSessionId: clientIp,
    riskScore: risk.riskScore,
    riskFlags: risk.riskFlags,
    riskNotes: risk.riskNotes,
    isUrgentReview: risk.isUrgentReview,
    auditTrail: [
      {
        id: uuid(),
        timestamp: Date.now(),
        previousStatus: 'PENDING',
        newStatus: 'PENDING',
        changedBy: 'system',
        reason: 'Initial community report submission via REST API',
      },
    ],
  };

  state.addReport(report);
  const publicReport = getPublicReport(report);
  io.emit('report:created', { report: publicReport });

  return res.status(201).json({ report: publicReport });
});

// Moderator: update report status (requires moderator key)
app.post('/api/reports/:id/verify', (req, res) => {
  const modKey = (req.headers['x-moderator-key'] as string) || req.body?.moderatorKey;
  if (!isAuthorizedModerator(modKey)) {
    return res.status(401).json({ error: 'Unauthorized: valid moderator authorization key required' });
  }

  const { newStatus, reason, moderatorName } = req.body || {};
  if (!['PENDING', 'VERIFIED', 'SUSPICIOUS', 'REJECTED'].includes(newStatus)) {
    return res.status(400).json({ error: 'Invalid target status' });
  }

  const updated = state.updateReportStatus(
    req.params.id,
    newStatus,
    moderatorName || 'Authorized Moderator',
    reason || 'Status updated via moderator REST API',
  );

  if (!updated) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const publicReport = getPublicReport(updated);
  io.emit('report:updated', { report: publicReport });

  return res.json({ report: publicReport });
});

// Moderator: escalate verified report to active emergency corridor
app.post('/api/reports/:id/escalate', (req, res) => {
  const modKey = (req.headers['x-moderator-key'] as string) || req.body?.moderatorKey;
  if (!isAuthorizedModerator(modKey)) {
    return res.status(401).json({ error: 'Unauthorized: valid moderator authorization key required' });
  }

  const report = state.getReport(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  if (report.status !== 'VERIFIED') {
    return res.status(400).json({
      error: 'Safe Handling Rule: Only VERIFIED reports can be escalated to an active emergency corridor',
    });
  }

  if (state.emergencySession?.status === 'active') {
    return res.status(409).json({ error: 'An emergency corridor is already active' });
  }

  const escalatedVehicleId = `esc-rep-${report.id.slice(0, 8)}`;
  const emergencyVehicle: Vehicle = {
    id: escalatedVehicleId,
    socketId: 'rest-escalation',
    role: 'emergency',
    location: report.location,
    lastSeen: Date.now(),
    label: `Escalated Unit: ${report.category.toUpperCase()}`,
  };

  state.addVehicle(emergencyVehicle);
  const session = state.startEmergency(
    escalatedVehicleId,
    report.location,
    req.body?.destination || null,
  );

  report.escalatedToEmergencyId = session.id;
  report.auditTrail.push({
    id: uuid(),
    timestamp: Date.now(),
    previousStatus: 'VERIFIED',
    newStatus: 'VERIFIED',
    changedBy: req.body?.moderatorName || 'Authorized Moderator',
    reason: 'Explicitly escalated into active emergency response corridor via REST API',
  });

  const publicReport = getPublicReport(report);
  io.emit('report:updated', { report: publicReport });
  io.emit('emergency:update', { session: state.getEmergencySessionPublic() });
  io.emit('vehicle:list', { vehicles: state.getAllVehiclesPublic() });

  const evt = state.addTimelineEvent(
    'emergency_started',
    `Active Emergency activated from verified report #${report.id.slice(0, 6)}: ${report.category.toUpperCase()}`,
    escalatedVehicleId,
  );
  io.emit('timeline:event', evt);

  return res.json({ success: true, report: publicReport, session });
});

// Bind to 0.0.0.0 for LAN accessibility
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║       🚑  MediRoute Server  🚑       ║');
  console.log('  ╠═══════════════════════════════════════╣');
  console.log(`  ║  Local:   http://localhost:${PORT}       ║`);
  console.log(`  ║  Network: http://0.0.0.0:${PORT}        ║`);
  console.log('  ║                                       ║');
  console.log('  ║  Socket.IO ready for connections       ║');
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('');
});
