import { Link } from 'react-router-dom';

export function IntegrationsSummaryCard() {
  return (
    <div className="summaryLinkCard">
      <div className="summaryLinkCardTop">
        <div>
          <div className="summaryLinkEyebrow">Integrations</div>
          <h3 className="summaryLinkTitle">Connected Systems</h3>
        </div>
      </div>

      <p className="summaryLinkText">
        View hospital connections, dispatch agencies, partner endpoints, and connection status.
      </p>

      <Link to="/admin/integrations" className="summaryLinkAction">
        Open Connected Systems →
      </Link>
    </div>
  );
}
