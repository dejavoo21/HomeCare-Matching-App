import { Link } from 'react-router-dom';

export function AuditSummaryCard() {
  return (
    <div className="summaryLinkCard">
      <div className="summaryLinkCardTop">
        <div>
          <div className="summaryLinkEyebrow">Compliance</div>
          <h3 className="summaryLinkTitle">Audit & Compliance</h3>
        </div>
      </div>

      <p className="summaryLinkText">
        Review authentication events, approvals, administrative actions, and traceability records.
      </p>

      <Link to="/admin/audit" className="summaryLinkAction">
        Open Audit & Compliance →
      </Link>
    </div>
  );
}
