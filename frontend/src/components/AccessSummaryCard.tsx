import { Link } from 'react-router-dom';

export function AccessSummaryCard() {
  return (
    <div className="summaryLinkCard">
      <div className="summaryLinkCardTop">
        <div>
          <div className="summaryLinkEyebrow">Security</div>
          <h3 className="summaryLinkTitle">Access Management</h3>
        </div>
      </div>

      <p className="summaryLinkText">
        Review user access requests, approve new accounts, and manage security settings.
      </p>

      <Link to="/admin/access" className="summaryLinkAction">
        Open Access Management -&gt;
      </Link>
    </div>
  );
}
