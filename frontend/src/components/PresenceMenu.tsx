import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import { PresenceDot } from './PresenceDot';

type PresenceStatus = 'online' | 'on_shift' | 'in_visit' | 'busy' | 'offline';

type PresenceState = {
  presenceStatus: PresenceStatus;
  customStatus?: string | null;
  lastSeenAt?: string | null;
};

const PRESENCE_OPTIONS: Array<{
  value: PresenceStatus;
  label: string;
  note: string;
}> = [
  { value: 'online', label: 'Available', note: 'Ready to respond' },
  { value: 'on_shift', label: 'On shift', note: 'Working active coverage' },
  { value: 'in_visit', label: 'In visit', note: 'Currently with a client' },
  { value: 'busy', label: 'Busy', note: 'Heads down on active work' },
  { value: 'offline', label: 'Appear offline', note: 'Hidden from live availability' },
];

function getStatusLabel(status: PresenceStatus) {
  return PRESENCE_OPTIONS.find((option) => option.value === status)?.label || 'Available';
}

export function PresenceMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [presence, setPresence] = useState<PresenceState>({
    presenceStatus: 'online',
    customStatus: null,
    lastSeenAt: null,
  });
  const rootRef = useRef<HTMLDivElement | null>(null);

  const currentLabel = useMemo(
    () => getStatusLabel(presence.presenceStatus),
    [presence.presenceStatus]
  );

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const response = (await api.getMyPresence()) as any;
        if (ignore) return;
        setPresence({
          presenceStatus: (response?.data?.presenceStatus || 'online') as PresenceStatus,
          customStatus: response?.data?.customStatus || null,
          lastSeenAt: response?.data?.lastSeenAt || null,
        });
      } catch (err) {
        console.error('Failed to load presence state:', err);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleSelect = async (status: PresenceStatus) => {
    if (status === presence.presenceStatus) {
      setOpen(false);
      return;
    }

    try {
      setBusy(true);
      const response = (await api.updateMyPresence({
        presenceStatus: status,
      })) as any;

      setPresence((current) => ({
        ...current,
        presenceStatus: (response?.data?.presenceStatus || status) as PresenceStatus,
        customStatus: response?.data?.customStatus || null,
        lastSeenAt: response?.data?.lastSeenAt || current.lastSeenAt || null,
      }));
      setOpen(false);
    } catch (err) {
      console.error('Failed to update presence state:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="presenceMenuRoot" ref={rootRef}>
      <button
        type="button"
        className="presenceMenuTrigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Set presence status. Current status ${currentLabel}`}
      >
        <span className={`presencePill presencePill-${presence.presenceStatus}`}>
          <PresenceDot status={presence.presenceStatus} />
          <span>{currentLabel}</span>
        </span>
        <ChevronDown size={16} className={open ? 'presenceMenuChevron presenceMenuChevron-open' : 'presenceMenuChevron'} />
      </button>

      {open ? (
        <div className="presenceMenuPopover" role="menu" aria-label="Presence status">
          <div className="presenceMenuHeader">
            <div className="presenceMenuTitle">Presence</div>
            <div className="presenceMenuSubtitle">Choose how the team sees you right now.</div>
          </div>

          <div className="presenceMenuOptions">
            {PRESENCE_OPTIONS.map((option) => {
              const selected = option.value === presence.presenceStatus;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={
                    selected
                      ? `presenceMenuOption presenceMenuOption-active presenceMenuOption-${option.value}`
                      : `presenceMenuOption presenceMenuOption-${option.value}`
                  }
                  onClick={() => handleSelect(option.value)}
                  disabled={busy}
                >
                  <span className={`presencePill presencePill-${option.value}`}>
                    <PresenceDot status={option.value} />
                    <span>{option.label}</span>
                  </span>
                  <span className="presenceMenuNote">{option.note}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
