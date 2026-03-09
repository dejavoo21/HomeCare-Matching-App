import { PresenceDot } from './PresenceDot';
import type { WorkforcePerson } from './WorkforceCard';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export function WorkforceProfileDrawer({
  person,
  onClose,
}: {
  person: WorkforcePerson | null;
  onClose: () => void;
}) {
  if (!person) return null;

  return (
    <div className="drawerOverlay" onClick={onClose} role="presentation">
      <aside
        className="drawerPanel workforceDrawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workforceDrawerTitle"
      >
        <div className="drawerHeader">
          <div>
            <h2 id="workforceDrawerTitle" className="drawerTitle">
              {person.name}
            </h2>
            <p className="drawerSubtitle">
              {String(person.role).toUpperCase()}
              {person.region ? ` • ${person.region}` : ''}
            </p>
          </div>

          <button className="btn btn-small btn-close" type="button" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="drawerBody">
          <section className="drawerSection workforceDrawerSection">
            <div className="drawerSectionTop">
              <div>
                <h3 className="sectionTitle">Presence</h3>
                <p className="muted">Live status and recent activity visibility.</p>
              </div>
            </div>

            <div className="workforcePresenceCard">
              <PresenceDot status={person.presenceStatus} showLabel />
              {person.customStatus ? (
                <div className="workforcePresenceNote">{person.customStatus}</div>
              ) : null}
              <div className="workforcePresenceSeen">
                Last seen: {formatDateTime(person.lastSeenAt)}
              </div>
            </div>
          </section>

          <section className="drawerSection workforceDrawerSection">
            <div className="drawerSectionTop">
              <div>
                <h3 className="sectionTitle">Workload</h3>
                <p className="muted">Current assignments and next scheduled work.</p>
              </div>
            </div>

            <div className="workforceDrawerGrid">
              <div className="workforceDrawerMetric">
                <span className="workforceDrawerLabel">Active visits</span>
                <strong>{person.currentWorkload?.activeVisits || 0}</strong>
              </div>
              <div className="workforceDrawerMetric">
                <span className="workforceDrawerLabel">Queued assignments</span>
                <strong>{person.currentWorkload?.queuedAssignments || 0}</strong>
              </div>
              <div className="workforceDrawerMetric workforceDrawerMetric-full">
                <span className="workforceDrawerLabel">Next visit</span>
                <strong>{formatDateTime(person.currentWorkload?.nextVisitAt)}</strong>
              </div>
            </div>
          </section>

          <section className="drawerSection workforceDrawerSection">
            <div className="drawerSectionTop">
              <div>
                <h3 className="sectionTitle">Contact</h3>
                <p className="muted">Role-based contact visibility for coordination.</p>
              </div>
            </div>

            <div className="workforceContactList">
              <div className="kv">
                <div className="k">Phone</div>
                <div className="v">{person.phone || 'Hidden for this role'}</div>
              </div>
              <div className="kv">
                <div className="k">Email</div>
                <div className="v">{person.email || 'Hidden for this role'}</div>
              </div>
            </div>

            <div className="workforceDrawerActions">
              <button className="btn btn-secondary" type="button" disabled>
                Message
              </button>
              <button className="btn btn-secondary" type="button" disabled>
                Call
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
