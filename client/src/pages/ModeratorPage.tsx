// ─── Authorized Emergency Report Moderator Page ───
import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  MapPin,
  Lock,
  Unlock,
  Radio,
  FileText,
  Key,
  Flame,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import type { EmergencyReport, EmergencyReportStatus, Coordinates } from '@/types';

interface ModeratorPageProps {
  connected: boolean;
  reports: EmergencyReport[];
  reportError?: string | null;
  onUpdateStatus: (
    reportId: string,
    newStatus: EmergencyReportStatus,
    reason: string,
    moderatorKey: string,
    moderatorName?: string,
  ) => void;
  onEscalateReport: (reportId: string, moderatorKey: string, destination?: Coordinates) => void;
}

export function ModeratorPage({
  connected,
  reports,
  reportError,
  onUpdateStatus,
  onEscalateReport,
}: ModeratorPageProps) {
  const [moderatorKey, setModeratorKey] = useState<string>(() => {
    try {
      return localStorage.getItem('mediroute_mod_key') || 'mediroute-mod-hackathon-2026';
    } catch {
      return 'mediroute-mod-hackathon-2026';
    }
  });
  const [moderatorName, setModeratorName] = useState<string>('Dispatcher Mod-1');
  const [activeTab, setActiveTab] = useState<'ALL' | 'URGENT' | EmergencyReportStatus>('ALL');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const saveModKey = (key: string) => {
    setModeratorKey(key);
    try {
      localStorage.setItem('mediroute_mod_key', key);
    } catch {}
  };

  const handleUpdate = (reportId: string, newStatus: EmergencyReportStatus) => {
    setActionError(null);
    setActionSuccess(null);
    if (!moderatorKey.trim()) {
      setActionError('Moderator authorization key is required to review reports.');
      return;
    }

    const reason = decisionReason.trim() || `Marked as ${newStatus} by ${moderatorName}`;
    onUpdateStatus(reportId, newStatus, reason, moderatorKey.trim(), moderatorName);
    setActionSuccess(`Report #${reportId.slice(0, 6)} updated to ${newStatus}.`);
    setDecisionReason('');
  };

  const handleEscalate = (reportId: string) => {
    setActionError(null);
    setActionSuccess(null);
    if (!moderatorKey.trim()) {
      setActionError('Moderator key required.');
      return;
    }

    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    if (report.status !== 'VERIFIED') {
      setActionError('Safe Handling Rule: Only VERIFIED reports can be escalated to an active emergency corridor.');
      return;
    }

    onEscalateReport(reportId, moderatorKey.trim());
    setActionSuccess(`Report #${reportId.slice(0, 6)} escalated! 1 km emergency corridor activated.`);
  };

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'URGENT') return r.isUrgentReview;
    return r.status === activeTab;
  });

  const urgentCount = reports.filter((r) => r.isUrgentReview && r.status === 'PENDING').length;
  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="pt-20 pb-16 px-4 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-accent-teal/15 border border-accent-teal/30 flex items-center justify-center text-accent-teal">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-text">Emergency Report Moderation</h1>
              <p className="text-xs text-muted-text">
                Authorized Verification & Misuse Prevention Queue
              </p>
            </div>
          </div>
        </div>

        {/* Prototype Authorization Bar */}
        <div className="bg-petrol/20 border border-petrol/40 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-accent-teal font-medium">
            <Key className="w-3.5 h-3.5" />
            <span>Moderator Key:</span>
          </div>
          <input
            type="password"
            value={moderatorKey}
            onChange={(e) => saveModKey(e.target.value)}
            placeholder="Enter moderator secret..."
            className="bg-midnight border border-petrol/50 rounded-lg px-2.5 py-1 text-xs text-primary-text focus:outline-none focus:border-accent-teal w-44 font-mono"
          />
          <input
            type="text"
            value={moderatorName}
            onChange={(e) => setModeratorName(e.target.value)}
            placeholder="Moderator Name"
            className="bg-midnight border border-petrol/50 rounded-lg px-2.5 py-1 text-xs text-primary-text focus:outline-none focus:border-accent-teal w-32"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => saveModKey('mediroute-mod-hackathon-2026')}
            className="text-[11px] py-1"
          >
            Use Demo Key
          </Button>
        </div>
      </div>

      {/* Security Architecture Notice */}
      <div className="p-3.5 rounded-xl bg-petrol/15 border border-petrol/30 text-xs text-muted-text flex items-start gap-2.5">
        <Info className="w-4 h-4 text-accent-teal shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[11px] leading-relaxed">
          <span className="text-primary-text font-semibold block">
            Hackathon Authorization & Safety Guarantees:
          </span>
          All verification and status changes are validated server-side against the shared moderator token. Ordinary users cannot mark their own reports as verified. Verified reports require an explicit, authorized escalation action before triggering the 1 km driver geofence.
        </div>
      </div>

      {/* Notification Toasts */}
      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {reportError && (
        <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{reportError}</span>
        </div>
      )}

      {/* Triage Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-petrol/30 pb-3">
        {(['ALL', 'URGENT', 'PENDING', 'VERIFIED', 'SUSPICIOUS', 'REJECTED'] as const).map((tab) => {
          const isActive = activeTab === tab;
          let badgeCount = 0;
          if (tab === 'ALL') badgeCount = reports.length;
          else if (tab === 'URGENT') badgeCount = urgentCount;
          else badgeCount = reports.filter((r) => r.status === tab).length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-accent-teal text-midnight font-semibold shadow-sm'
                  : 'bg-midnight/60 border border-petrol/30 text-muted-text hover:text-primary-text hover:border-petrol/60'
              }`}
            >
              <span>{tab === 'URGENT' ? 'Urgent Review' : tab}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-midnight/30 text-midnight font-bold' : 'bg-petrol/40 text-muted-text'
                }`}
              >
                {badgeCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card className="p-12 text-center text-muted-text space-y-3">
          <FileText className="w-10 h-10 mx-auto text-muted-text/40" />
          <p className="text-sm">No emergency reports found matching tab "{activeTab}".</p>
          <a href="/report">
            <Button size="sm" variant="ghost" className="mt-2 text-xs">
              Submit a Test Community Report
            </Button>
          </a>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const isSelected = selectedReportId === report.id;
            const isAuditExpanded = expandedAuditId === report.id;

            return (
              <Card
                key={report.id}
                className={`p-5 transition-all space-y-4 border ${
                  report.status === 'VERIFIED'
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : report.status === 'SUSPICIOUS'
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : report.status === 'REJECTED'
                    ? 'border-red-500/30 bg-red-950/10 opacity-75'
                    : 'border-petrol/40'
                }`}
              >
                {/* Header row: Status, Category, Urgent Flag, Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-accent-teal">
                      #{report.id.slice(0, 8)}
                    </span>
                    <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-petrol/40 text-primary-text">
                      {report.category}
                    </span>

                    {/* Status Badge */}
                    {report.status === 'PENDING' && (
                      <Badge variant="amber">PENDING (Unverified)</Badge>
                    )}
                    {report.status === 'VERIFIED' && (
                      <Badge variant="teal">VERIFIED</Badge>
                    )}
                    {report.status === 'SUSPICIOUS' && (
                      <Badge variant="amber">SUSPICIOUS</Badge>
                    )}
                    {report.status === 'REJECTED' && (
                      <Badge variant="red">REJECTED</Badge>
                    )}

                    {/* Urgent Review Badge */}
                    {report.isUrgentReview && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
                        <Flame className="w-3 h-3" />
                        URGENT REVIEW
                      </span>
                    )}

                    {report.escalatedToEmergencyId && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                        <Radio className="w-3 h-3" />
                        ESCALATED TO CORRIDOR
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-muted-text flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {/* Description & Location */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-xs text-primary-text leading-relaxed">
                      {report.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-text">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-accent-teal" />
                        <span>{report.locationAddress || 'Kerala Incident Location'}</span>
                      </span>
                      <span className="font-mono text-accent-teal">
                        ({report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)})
                      </span>
                      <span className="text-muted-text/80">
                        Source: {report.locationSource.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Attached Photo Thumbnail (if present) */}
                  {report.photoUrl && (
                    <div className="rounded-xl overflow-hidden border border-petrol/40 max-h-32 relative group">
                      <img
                        src={report.photoUrl}
                        alt="Incident Evidence"
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-midnight/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a
                          href={report.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-accent-teal font-semibold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View Photo
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Automated Risk Checks Card */}
                <div className="rounded-xl bg-midnight/80 border border-petrol/40 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary-text flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent-teal" />
                      Automated Risk Assessment Checks:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-text">Risk Indicator:</span>
                      <span
                        className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                          report.riskScore > 50
                            ? 'bg-red-500/20 text-red-400'
                            : report.riskScore > 20
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {report.riskScore}%
                      </span>
                    </div>
                  </div>

                  {/* Risk Notes */}
                  {report.riskNotes.length > 0 ? (
                    <div className="space-y-1">
                      {report.riskNotes.map((note, idx) => (
                        <div key={idx} className="text-[11px] text-amber-200/90 flex items-start gap-1.5">
                          <span className="text-amber-400">•</span>
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-400/90">
                      ✅ No duplicate proximity or image reuse markers detected.
                    </p>
                  )}

                  {/* Explainability disclaimer */}
                  <div className="text-[10px] text-muted-text/80 pt-1 border-t border-petrol/20">
                    *Automated checks support human moderation. They do not conclusively prove or disprove incident authenticity. Repeated submissions from the same session are not counted as independent corroboration.
                  </div>
                </div>

                {/* Moderator Decision & Escalation Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-petrol/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter verification / decision notes..."
                      value={selectedReportId === report.id ? decisionReason : ''}
                      onChange={(e) => {
                        setSelectedReportId(report.id);
                        setDecisionReason(e.target.value);
                      }}
                      className="bg-midnight border border-petrol/40 rounded-lg px-3 py-1.5 text-xs text-primary-text focus:outline-none focus:border-accent-teal w-64"
                    />

                    {/* Verify Action */}
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleUpdate(report.id, 'VERIFIED')}
                      disabled={report.status === 'VERIFIED'}
                      className="text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Verify
                    </Button>

                    {/* Mark Suspicious Action */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUpdate(report.id, 'SUSPICIOUS')}
                      className="text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Suspicious
                    </Button>

                    {/* Reject Action */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUpdate(report.id, 'REJECTED')}
                      className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>

                  {/* Explicit Escalation Action (ONLY for Verified reports) */}
                  <div className="flex items-center gap-2">
                    {report.status === 'VERIFIED' && !report.escalatedToEmergencyId && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleEscalate(report.id)}
                        className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs animate-pulse"
                      >
                        <Radio className="w-3.5 h-3.5 mr-1" />
                        Escalate to 1 km Emergency Corridor
                      </Button>
                    )}

                    {/* Audit trail toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedAuditId(isAuditExpanded ? null : report.id)}
                      className="text-[11px] text-muted-text hover:text-primary-text flex items-center gap-1"
                    >
                      <span>Audit ({report.auditTrail.length})</span>
                      {isAuditExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Audit Trail Drawer */}
                {isAuditExpanded && (
                  <div className="pt-3 border-t border-petrol/20 space-y-2">
                    <span className="text-[11px] font-semibold text-primary-text block">
                      Moderator Decision Audit Trail:
                    </span>
                    <div className="space-y-1.5">
                      {report.auditTrail.map((entry) => (
                        <div
                          key={entry.id}
                          className="bg-midnight/60 rounded-lg p-2 text-[10px] text-muted-text flex flex-wrap items-center justify-between gap-2 border border-petrol/20"
                        >
                          <div>
                            <strong className="text-primary-text">{entry.changedBy}</strong>: {entry.previousStatus} ➔{' '}
                            <span className="text-accent-teal font-semibold">{entry.newStatus}</span> ({entry.reason})
                          </div>
                          <span className="font-mono text-muted-text/70">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
