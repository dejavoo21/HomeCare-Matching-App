import { IntegrationReliabilityPanel } from '../components/IntegrationReliabilityPanel';
import '../index.css';

export function AdminReliabilityPage() {
  return (
    <main className="pageStack" role="main" aria-label="Integration reliability page">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Integration Reliability</h1>
            <p className="subtitle">
              Monitor webhook subscriptions, recent deliveries, retries, and dead-letter recovery.
            </p>
          </div>
        </div>
      </section>
      <IntegrationReliabilityPanel />
    </main>
  );
}
