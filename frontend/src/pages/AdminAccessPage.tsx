import { AccessRequestsPanel } from '../components/AccessRequestsPanel';
import { TotpSettingsPanel } from '../components/TotpSettingsPanel';
import { useState } from 'react';
import '../index.css';

export function AdminAccessPage() {
  const [refreshKey] = useState(1);

  return (
    <main className="pageStack" role="main" aria-label="Access management page">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Access Management</h1>
            <p className="subtitle">
              Manage user access requests, role approvals, and multi-factor authentication.
            </p>
          </div>
        </div>
      </section>

      <section className="pageGridTwo">
        <AccessRequestsPanel refreshKey={refreshKey} />
        <TotpSettingsPanel />
      </section>
    </main>
  );
}
