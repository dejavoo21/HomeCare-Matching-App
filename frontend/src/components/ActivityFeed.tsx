import { useEffect, useState } from "react";
import { api } from "../services/api";

type Activity = { id: string; type: string; timestamp: number; [k: string]: any };

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString();
}

export function ActivityFeed({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<Activity[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getActivityFeed() as any;
        setItems(res.data || []);
      } catch {
        setItems([]);
      }
    })();
  }, [refreshKey]);

  return (
    <div className="sideCard" aria-label="Activity feed">
      <div className="sideHeader">
        <div>
          <h3 className="sideTitle">Live Activity</h3>
          <p className="muted">Latest system events</p>
        </div>
      </div>

      <div className="activityList" role="log" aria-live="polite" aria-label="Activity log">
        {items.length === 0 ? (
          <div className="emptySmall">No activity yet.</div>
        ) : (
          items.slice(0, 6).map((e) => (
            <div key={e.id} className="activityItem" role="listitem">
              <div className="activityTop">
                <span className="pill small" aria-label={`Event type: ${e.type}`}>{e.type}</span>
                <span className="muted mono" aria-label={`Time: ${formatTime(e.timestamp)}`}>{formatTime(e.timestamp)}</span>
              </div>
              <div className="activityMeta muted">
                {e.requestId && <>Request: <span className="mono">{String(e.requestId).slice(0, 8)}</span></>}
                {e.professionalId && <> • Pro: <span className="mono">{String(e.professionalId).slice(0, 8)}</span></>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
