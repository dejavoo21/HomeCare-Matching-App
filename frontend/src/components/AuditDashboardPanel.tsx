import { useEffect, useState } from 'react';
import { api } from '../services/api';

type AuditEventRow = {
  id: string;
  actor_user_id?: string | null;
  actor_email?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: any;
  severity?: string;
  created_at: string;
};

type Summary = {
  totalEvents: number;
  topActions: Array<{ action: string; count: number }>;
  severityBreakdown: Array<{ severity: string; count: number }>;
  loginsLast24h: number;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function severityClass(severity?: string | null) {
  const s = String(severity || 'info').toLowerCase();
  if (s === 'warning') return 'pill pill-warning';
  if (s === 'critical') return 'pill pill-critical';
  return 'pill pill-info';
}

export function AuditDashboardPanel({ refreshKey }: { refreshKey?: number }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<AuditEventRow[]>([]);
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);

      const [summaryResp, eventsResp] = await Promise.all([
        api.getAuditSummary() as any,
        api.getAuditEvents({
          q: q || undefined,
          severity: severity === 'all' ? undefined : severity,
          limit: 20,
        }) as any,
      ]);

      setSummary(summaryResp?.data || null);
      setEvents(eventsResp?.data || []);
    } catch (err) {
      console.error('Failed to load audit dashboard:', err);
      setSummary(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey, q, severity]);

  return (
    <div className="auditDashboardCard" aria-label="Audit dashboard">
      <div className="auditHeader">
        <div>
          <h3 className="auditTitle">Audit Dashboard</h3>
          <p className="muted">Authentication, approvals, and admin activity</p>
        </div>
      </div>

      <div className="auditToolbar">
        <input
          className="input"
          placeholder="Search action, actor, entity..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search audit events"
        />

        <select
          className="select"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          aria-label="Filter by severity"
        >
          <option value="all">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {loading ? (
        <div className="empty">Loading audit dashboard…</div>
      ) : (
        <>
          <div className="auditStatsGrid">
            <div className="auditStat">
              <div className="auditStatLabel">Total Events</div>
              <div className="auditStatValue">{summary?.totalEvents ?? 0}</div>
            </div>

            <div className="auditStat">
              <div className="auditStatLabel">Logins (24h)</div>
              <div className="auditStatValue">{summary?.loginsLast24h ?? 0}</div>
            </div>

            <div className="auditStat">
              <div className="auditStatLabel">Top Action</div>
              <div className="auditStatValue auditStatText">
                {summary?.topActions?.[0]?.action || '—'}
              </div>
            </div>
          </div>

          <div className="auditSection">
            <div className="auditSectionTitle">Recent Events</div>

            {events.length === 0 ? (
              <div className="empty">No audit events found.</div>
            ) : (
              <div className="auditList">
                {events.map((item) => (
                  <div key={item.id} className="auditItem">
                    <div className="auditItemTop">
                      <span className={severityClass(item.severity)}>
                        {String(item.severity || 'info').toUpperCase()}
                      </span>
                      <span className="auditAction">{item.action}</span>
                    </div>

                    <div className="auditMeta muted">
                      {item.actor_email || 'System'} • {item.entity_type || '—'} • {item.entity_id || '—'}
                    </div>

                    <div className="auditDate muted">
                      {formatDate(item.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {summary?.topActions?.length ? (
            <div className="auditSection">
              <div className="auditSectionTitle">Top Actions</div>
              <div className="auditChips">
                {summary.topActions.map((a) => (
                  <span key={a.action} className="auditChip">
                    {a.action} <b>{a.count}</b>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
