import { AuditDashboardPanel } from '../components/AuditDashboardPanel';

export function AdminAuditPage() {
  return (
    <div className="pageStack">
      <div className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Audit & Compliance</h1>
            <p className="subtitle">
              Review authentication events, admin actions, approvals, and platform traceability.
            </p>
          </div>
        </div>
      </div>

      <AuditDashboardPanel />
    </div>
  );
}
