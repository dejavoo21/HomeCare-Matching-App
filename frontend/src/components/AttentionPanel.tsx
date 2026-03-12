import { Link } from 'react-router-dom';

type AttentionRequest = {
  urgency?: string;
  status?: string;
  offerExpiresAt?: string | null;
};

export function AttentionPanel({ requests }: { requests: AttentionRequest[] }) {
  const criticalCount = requests.filter((request) => {
    const urgency = String(request.urgency || '').toLowerCase();
    const status = String(request.status || '').toLowerCase();
    return urgency === 'critical' && status !== 'completed' && status !== 'cancelled';
  }).length;

  const expiringSoonCount = requests.filter((request) => {
    const status = String(request.status || '').toLowerCase();
    if (!request.offerExpiresAt || status !== 'offered') return false;

    const expiry = new Date(request.offerExpiresAt).getTime();
    const now = Date.now();
    const inThirtyMinutes = now + 30 * 60 * 1000;
    return expiry > now && expiry <= inThirtyMinutes;
  }).length;

  const queuePressure = requests.filter(
    (request) => String(request.status || '').toLowerCase() === 'queued'
  ).length;

  return (
    <aside className="railCard railCard-compact" aria-label="Dispatch attention">
      <div className="railCardInner">
        <div className="railCardHeader">
          <div>
            <div className="railCardEyebrow">Dispatch priority</div>
            <h3 className="railCardTitle">Dispatch Attention</h3>
            <p className="railCardSubtitle">High-signal queue conditions that need rapid review.</p>
          </div>

          <div className={`railPill ${criticalCount > 0 ? 'railPill-danger' : 'railPill-neutral'}`}>
            {criticalCount > 0 ? 'Action needed' : 'Stable'}
          </div>
        </div>

        <div className="railCardDivider" />

        <div className="railSignalGrid">
          <div
            className={`railSignalCard ${criticalCount > 0 ? 'railSignalCard-danger' : 'railSignalCard-neutral'}`}
          >
            <div className="railSignalLabel">Critical requests</div>
            <div className="railSignalValue">{criticalCount}</div>
          </div>

          <div
            className={`railSignalCard ${expiringSoonCount > 0 ? 'railSignalCard-warning' : 'railSignalCard-neutral'}`}
          >
            <div className="railSignalLabel">Offers expiring soon</div>
            <div className="railSignalValue">{expiringSoonCount}</div>
          </div>

          <div className="railSignalCard railSignalCard-neutral">
            <div className="railSignalLabel">Queued requests waiting</div>
            <div className="railSignalValue">{queuePressure}</div>
          </div>
        </div>

        <div className="railCardDivider" />

        <Link to="/admin/dispatch" className="summaryCardAction">
          Review live dispatch <span aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  );
}
