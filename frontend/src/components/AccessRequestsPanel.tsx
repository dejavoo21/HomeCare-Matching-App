import { useEffect, useState } from 'react';
import { api } from '../services/api';

type AccessRequestRow = {
  id: string;
  requester_name?: string | null;
  requester_email: string;
  requested_role: string;
  reason?: string | null;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  reviewer_email?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export function AccessRequestsPanel({ refreshKey }: { refreshKey?: number }) {
  const [items, setItems] = useState<AccessRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const response = await api.getAccessRequests() as any;
      setItems(response?.data || []);
    } catch (err) {
      console.error('Failed to load access requests:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      setBusyId(id);
      await api.decideAccessRequest(id, decision);
      await load();
    } catch (err) {
      console.error(`Failed to ${decision} access request:`, err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="sideCard" aria-label="Access requests">
      <div className="sideHeader">
        <div>
          <h3 className="sideTitle">Access Requests</h3>
          <p className="muted">Review pending access requests</p>
        </div>
      </div>

      <div className="rowGap">
        {loading ? (
          <div className="empty">Loading access requests…</div>
        ) : items.length === 0 ? (
          <div className="empty">No access requests found.</div>
        ) : (
          <div className="accessList">
            {items.map((item) => (
              <div key={item.id} className="accessItem">
                <div className="accessTop">
                  <div className="accessTitle">
                    {item.requester_name || item.requester_email}
                  </div>
                  <span className={`pill pill-${item.status}`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>

                <div className="accessMeta muted">
                  {item.requester_email} • {String(item.requested_role).toUpperCase()}
                </div>

                {item.reason && (
                  <div className="accessReason">{item.reason}</div>
                )}

                <div className="accessDates muted">
                  Requested: {formatDate(item.created_at)}
                  {item.reviewed_at ? ` • Reviewed: ${formatDate(item.reviewed_at)}` : ''}
                </div>

                {item.status === 'pending' && (
                  <div className="actionsRow">
                    <button
                      className="btn btn-small btn-primary"
                      disabled={busyId === item.id}
                      onClick={() => decide(item.id, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      disabled={busyId === item.id}
                      onClick={() => decide(item.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
