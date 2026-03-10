import { Link } from 'react-router-dom';

export function AuditSummaryCard() {
  return (
    <div className="summaryCard summaryCard-violet">
      <div>
        <div className="summaryCardEyebrow">Compliance</div>
        <h3 className="summaryCardTitle">Audit & Compliance</h3>
        <p className="summaryCardBody">
          Review authentication events, approvals, administrative actions, and traceability records.
        </p>
      </div>

      <Link to="/admin/audit" className="summaryCardAction">
        Open Audit & Compliance <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
