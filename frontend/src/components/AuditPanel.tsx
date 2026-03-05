import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type AuditRow = {
  id: string;
  actor_user_id?: string | null;
  actor_role?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  severity: 'info' | 'warning' | 'critical';
  metadata: any;
  created_at: string;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString();
}

function sevClass(s: string) {
  const v = String(s || '').toLowerCase();
  if (v === 'critical') return 'pill pill-crit';
  if (v === 'warning') return 'pill pill-warn';
  return 'pill pill-info';
}

export function AuditPanel({ refreshKey }: { refreshKey?: number }) {
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState('all');
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res: any = await api.getAuditEvents({
          q: q.trim() || undefined,
          severity: severity === 'all' ? undefined : severity,
          limit: 50,
        });
        if (!alive) return;
        setItems(res?.data || []);
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [q, severity, refreshKey]);

  const has = useMemo(() => items && items.length > 0, [items]);

  return (
    <div className="sideCard" aria-label="Audit trail">
      <div className="sideHeader">
        <div>
          <h3 className="sideTitle">Audit Trail</h3>
          <p className="muted">Security + admin actions log</p>
        </div>
      </div>

      <div className="rowGap">
        <div className="row">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search action, request id, actor..."
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

        <div className="auditList" role="log" aria-live="polite">
          {loading ? (
            <div className="empty">Loading audit events…</div>
          ) : !has ? (
            <div className="empty">No audit events yet.</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="auditItem">
                <div className="auditTop">
                  <span className={sevClass(it.severity)}>{it.severity.toUpperCase()}</span>
                  <span className="auditAction">{it.action}</span>
                  <span className="auditTime muted">{fmtTime(it.created_at)}</span>
                </div>

                <div className="auditSub muted">
                  <span className="mono">{it.entity_type}</span>
                  {it.entity_id ? <span className="mono"> • {String(it.entity_id).slice(0, 8)}</span> : null}
                  {it.actor_role ? <span> • {String(it.actor_role).toUpperCase()}</span> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
