import { PresenceDot } from './PresenceDot';

export type WorkforcePerson = {
  id: string;
  name: string;
  role: string;
  region?: string | null;
  phone?: string | null;
  email?: string | null;
  customStatus?: string | null;
  presenceStatus?: string;
  lastSeenAt?: string | null;
  currentWorkload?: {
    activeVisits: number;
    queuedAssignments: number;
    nextVisitAt?: string | null;
  };
};

function initials(name: string) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function formatNextVisit(value?: string | null) {
  if (!value) return 'No visit scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No visit scheduled';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function WorkforceCard({
  person,
  onViewProfile,
  onMessage,
  onCall,
}: {
  person: WorkforcePerson;
  onViewProfile: () => void;
  onMessage: () => void;
  onCall: () => void;
}) {
  return (
    <article className="workforceCard">
      <div className="workforceCardTop">
        <div className="workforceIdentity">
          <div className="workforceAvatar">{initials(person.name)}</div>

          <div>
            <div className="workforceName">{person.name}</div>
            <div className="workforceMeta">
              {String(person.role).toUpperCase()}
              {person.region ? ` • ${person.region}` : ''}
            </div>
          </div>
        </div>

        <div className="workforcePresenceStack">
          <span className={`presencePill presencePill-${String(person.presenceStatus || 'offline')}`}>
            <PresenceDot status={person.presenceStatus} />
            {String(person.presenceStatus || 'offline').replace('_', ' ')}
          </span>

          {person.customStatus ? (
            <div className="workforceSubtleText">{person.customStatus}</div>
          ) : null}
        </div>
      </div>

      <div className="workforceStats">
        <div className="workforceStat">
          <span className="workforceStatLabel">Active visits</span>
          <strong>{person.currentWorkload?.activeVisits || 0}</strong>
        </div>
        <div className="workforceStat">
          <span className="workforceStatLabel">Queued</span>
          <strong>{person.currentWorkload?.queuedAssignments || 0}</strong>
        </div>
        <div className="workforceStat workforceStat-wide">
          <span className="workforceStatLabel">Next visit</span>
          <strong>{formatNextVisit(person.currentWorkload?.nextVisitAt)}</strong>
        </div>
      </div>

      <div className="workforceContact">
        {person.phone ? <div>{person.phone}</div> : <div>Phone hidden</div>}
        {person.email ? <div>{person.email}</div> : <div>Email hidden</div>}
      </div>

      <div className="workforceActions">
        <button className="btn btn-secondary" type="button" onClick={onMessage}>
          Message
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCall}>
          Call
        </button>
        <button className="btn btn-primary" type="button" onClick={onViewProfile}>
          View Profile
        </button>
      </div>
    </article>
  );
}
