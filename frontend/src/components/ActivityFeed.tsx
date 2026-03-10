import { useEffect, useState } from 'react';
import { api } from '../services/api';

type Activity = {
  id: string;
  type: string;
  timestamp: number;
  requestId?: string;
  professionalId?: string;
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString();
}

function formatMeta(item: Activity) {
  const parts: string[] = [];
  if (item.requestId) parts.push(`Request ${String(item.requestId).slice(0, 8)}`);
  if (item.professionalId) parts.push(`Clinician ${String(item.professionalId).slice(0, 8)}`);
  if (!parts.length) return formatTime(item.timestamp);
  return `${parts.join(' • ')} • ${formatTime(item.timestamp)}`;
}

export function ActivityFeed({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<Activity[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = (await api.getActivityFeed()) as any;
        setItems(res.data || []);
      } catch {
        setItems([]);
      }
    })();
  }, [refreshKey]);

  return (
    <aside className="railCard" aria-label="Live activity">
      <div className="railCardInner">
        <div className="railCardHeader">
          <div>
            <div className="railCardEyebrow">System events</div>
            <h3 className="railCardTitle">Live Activity</h3>
            <p className="railCardSubtitle">Latest operational and platform events.</p>
          </div>

          <div className="railPill railPill-neutral">Realtime</div>
        </div>

        <div className="railCardDivider" />

        {items.length === 0 ? (
          <div className="railEmptyState">
            <div className="railEmptyText">No activity yet.</div>
          </div>
        ) : (
          <div className="railActivityList" role="log" aria-live="polite" aria-label="Activity log">
            {items.slice(0, 6).map((item) => (
              <div key={item.id} className="railActivityItem" role="listitem">
                <div className="railActivityTitle">{item.type}</div>
                <div className="railActivityMeta">{formatMeta(item)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
