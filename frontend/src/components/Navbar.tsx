import { useAuth } from '../contexts/AuthContext';
import { useCommunication } from '../contexts/CommunicationContext';
import { useRealTime } from '../contexts/RealTimeContext';
import { CommunicationHub } from './CommunicationHub';
import { PresenceMenu } from './PresenceMenu';
import '../index.css';

function getConnectionLabel(state: string) {
  if (state === 'connected') return 'Realtime connected';
  if (state === 'reconnecting') return 'Reconnecting';
  return 'Realtime paused';
}

function getConnectionClass(state: string) {
  if (state === 'connected') return 'navStatus navStatus-ok';
  if (state === 'reconnecting') return 'navStatus navStatus-warn';
  return 'navStatus navStatus-muted';
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { state } = useRealTime();
  const { summary } = useCommunication();

  if (!user) return null;

  return (
    <header className="topbar">
      <div className="topbarInner">
        <div className="topbarLeft">
          <div className="topbarBrandBlock">
            <span className="topbarBrandMark" aria-hidden="true">HC</span>
            <span className="topbarBrandMeta">
              <span className="topbarBrandText">Homecare Matching App</span>
              <span className="topbarBrandSubtext">Admin operations</span>
            </span>
          </div>
        </div>

        <div className="topbarRight">
          <CommunicationHub />
          <PresenceMenu />

          {state !== 'connected' && (
            <div className={`${getConnectionClass(state)} topbarStatusPill`}>
              <span className="navStatusDot" aria-hidden="true" />
              <span>{getConnectionLabel(state)}</span>
            </div>
          )}

          <div className="topbarUser" aria-label={`Signed in as ${user.name} (${user.role})`}>
            <span className="topbarUserName">{user.name}</span>
            <span className="topbarUserRole">{user.role}</span>
            {summary.unreadMessages > 0 ? (
              <span className="topbarInlineBadge" aria-label={`${summary.unreadMessages} unread messages`}>
                {summary.unreadMessages}
              </span>
            ) : null}
          </div>

          <button onClick={logout} className="btn btn-topbar" type="button">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
