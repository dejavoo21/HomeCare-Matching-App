type PresenceStatus = 'offline' | 'online' | 'on_shift' | 'in_visit' | 'busy' | string;

function labelForStatus(status: PresenceStatus) {
  return String(status || 'offline').replace(/_/g, ' ');
}

export function PresenceDot({
  status,
  showLabel = false,
}: {
  status?: PresenceStatus;
  showLabel?: boolean;
}) {
  const normalized = String(status || 'offline').toLowerCase();

  return (
    <span className={showLabel ? 'presenceMeta' : 'presenceDotWrap'}>
      <span
        className={`presenceDot presenceDot-${normalized}`}
        aria-hidden="true"
      />
      {showLabel ? <span className="presenceLabel">{labelForStatus(normalized)}</span> : null}
    </span>
  );
}
