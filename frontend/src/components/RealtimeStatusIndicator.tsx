import { useRealTime } from '../contexts/RealTimeContext';

export function RealtimeStatusIndicator() {
  const { state } = useRealTime();

  const label =
    state === 'connected'
      ? 'Live'
      : state === 'reconnecting'
        ? 'Reconnecting...'
        : state === 'disconnected'
          ? 'Sync unavailable'
          : 'Unknown';

  const stateClass =
    state === 'connected'
      ? 'is-connected'
      : state === 'reconnecting'
        ? 'is-reconnecting'
        : state === 'disconnected'
          ? 'is-disconnected'
          : 'is-unknown';

  return (
    <div className={`rtStatus ${stateClass}`} aria-live="polite" aria-label={`Realtime status: ${label}`}>
      <span className="rtDot" />
      {label}
    </div>
  );
}
