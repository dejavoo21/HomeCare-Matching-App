import { Link } from 'react-router-dom';

export function IntegrationsSummaryCard() {
  return (
    <div className="summaryCard summaryCard-sky">
      <div>
        <div className="summaryCardEyebrow">Integrations</div>
        <h3 className="summaryCardTitle">Connected Systems</h3>
        <p className="summaryCardBody">
          View hospital connections, dispatch agencies, partner endpoints, and connection status.
        </p>
      </div>

      <Link to="/admin/integrations" className="summaryCardAction">
        Open Connected Systems <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
