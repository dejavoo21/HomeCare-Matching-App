import { AuditDashboardPanel } from '../components/AuditDashboardPanel';

export function AdminAuditPage() {
  return (
    <main className="pageStack" role="main" aria-label="Audit and compliance page">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Audit & Compliance</h1>
            <p className="subtitle">
              Review authentication events, admin actions, approvals, and platform traceability.
            </p>
          </div>
        </div>
      </section>

      <AuditDashboardPanel />
    </main>
  );
}
