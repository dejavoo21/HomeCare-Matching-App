import { Link } from 'react-router-dom';

export function AccessSummaryCard() {
  return (
    <div className="summaryCard summaryCard-amber">
      <div>
        <div className="summaryCardEyebrow">Security</div>
        <h3 className="summaryCardTitle">Access Management</h3>
        <p className="summaryCardBody">
          Review user access requests, approve new accounts, and manage security settings.
        </p>
      </div>

      <Link to="/admin/access" className="summaryCardAction">
        Open Access Management <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
