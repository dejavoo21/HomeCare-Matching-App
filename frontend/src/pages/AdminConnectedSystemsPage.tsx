import { ConnectedSystemsPanel } from '../components/ConnectedSystemsPanel';
import '../index.css';

export function AdminConnectedSystemsPage() {
  return (
    <main className="pageStack" role="main" aria-label="Connected systems page">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Connected Systems</h1>
            <p className="subtitle">
              Manage hospital endpoints, dispatch agencies, and partner connections.
            </p>
          </div>
        </div>
      </section>

      <ConnectedSystemsPanel />
    </main>
  );
}
