import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { getBrowserLocation } from '../utils/location';

type EvvEvent = {
  id: string;
  event_type: string;
  event_time?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
};

type EvvVisit = {
  evv_status?: string;
  checked_in_at?: string;
  checked_out_at?: string;
};

type EvvResponse = {
  visit?: EvvVisit;
  events?: EvvEvent[];
};

export function EvvVisitPanel({ requestId }: { requestId: string }) {
  const [data, setData] = useState<EvvResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [capturingLocation, setCapturingLocation] = useState(false);

  const load = async () => {
    try {
      const response = (await api.getEvvForRequest(requestId)) as { data?: EvvResponse };
      setData(response?.data || null);
    } catch (err) {
      console.error('Failed to load EVV:', err);
      setData(null);
    }
  };

  useEffect(() => {
    if (!requestId) {
      return;
    }
    load();
  }, [requestId]);

  const checkIn = async () => {
    try {
      setBusy(true);
      setCapturingLocation(true);
      setMessage('');
      const location = await getBrowserLocation();
      await api.evvCheckIn({
        requestId,
        latitude: location.latitude,
        longitude: location.longitude,
        notes: location.error ? `Location note: ${location.error}` : undefined,
      });
      await api.updateMyPresence({ presenceStatus: 'in_visit' }).catch(() => {});
      setMessage(
        location.error ? `Checked in. ${location.error}` : 'Checked in successfully with location.'
      );
      await load();
    } catch (err: any) {
      setMessage(err?.message || 'Failed to check in');
    } finally {
      setBusy(false);
      setCapturingLocation(false);
    }
  };

  const checkOut = async () => {
    try {
      setBusy(true);
      setCapturingLocation(true);
      setMessage('');
      const location = await getBrowserLocation();
      await api.evvCheckOut({
        requestId,
        latitude: location.latitude,
        longitude: location.longitude,
        notes: location.error ? `Location note: ${location.error}` : undefined,
      });
      await api.updateMyPresence({ presenceStatus: 'on_shift' }).catch(() => {});
      setMessage(
        location.error
          ? `Checked out. ${location.error}`
          : 'Checked out successfully with location.'
      );
      await load();
    } catch (err: any) {
      setMessage(err?.message || 'Failed to check out');
    } finally {
      setBusy(false);
      setCapturingLocation(false);
    }
  };

  const visit = data?.visit;
  const events = data?.events || [];

  return (
    <div className="drawerSection">
      <div className="drawerSectionTop">
        <div>
          <h3 className="sectionTitle">EVV</h3>
          <p className="muted">
            Electronic visit verification timeline, status, and location-aware check-in/out.
          </p>
        </div>

        <div className="evvActions">
          <button
            className="btn btn-primary btn-small"
            onClick={checkIn}
            disabled={
              busy || visit?.evv_status === 'in_progress' || visit?.evv_status === 'completed'
            }
          >
            {capturingLocation && busy ? 'Checking In...' : 'Check In'}
          </button>

          <button
            className="btn btn-secondary btn-small"
            onClick={checkOut}
            disabled={busy || visit?.evv_status !== 'in_progress'}
          >
            {capturingLocation && busy ? 'Checking Out...' : 'Check Out'}
          </button>
        </div>
      </div>

      <div className="evvSummaryRow">
        <div className="evvSummaryCard">
          <div className="settingsOverviewLabel">Status</div>
          <div className="settingsOverviewValue evvStatusText">
            {visit?.evv_status || 'not_started'}
          </div>
        </div>

        <div className="evvSummaryCard">
          <div className="settingsOverviewLabel">Checked In</div>
          <div className="evvMetaValue">
            {visit?.checked_in_at ? new Date(visit.checked_in_at).toLocaleString() : '-'}
          </div>
        </div>

        <div className="evvSummaryCard">
          <div className="settingsOverviewLabel">Checked Out</div>
          <div className="evvMetaValue">
            {visit?.checked_out_at ? new Date(visit.checked_out_at).toLocaleString() : '-'}
          </div>
        </div>
      </div>

      {message ? (
        <div className="note" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}

      <div className="evvTimeline">
        {events.length === 0 ? (
          <div className="empty">No EVV events recorded yet.</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="evvTimelineItem">
              <div className="evvTimelineType">
                {String(event.event_type).replace('_', ' ').toUpperCase()}
              </div>
              <div className="evvTimelineMeta">
                {event.event_time ? new Date(event.event_time).toLocaleString() : '-'}
              </div>
              {event.latitude || event.longitude ? (
                <div className="evvTimelineMeta">
                  Location: {event.latitude ?? '-'}, {event.longitude ?? '-'}
                </div>
              ) : null}
              {event.notes ? <div className="evvTimelineMeta">{event.notes}</div> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
