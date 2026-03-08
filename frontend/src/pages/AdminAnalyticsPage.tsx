import { useCallback, useEffect, useState } from 'react';
import { AnalyticsDashboardPanel } from '../components/AnalyticsDashboardPanel';
import '../index.css';

export function AdminAnalyticsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="pageStack" role="main" aria-label="Analytics page">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Analytics</h1>
            <p className="subtitle">
              Review operational trends, dispatch performance, workload balance, and throughput.
            </p>
          </div>

          <div className="pageActions">
            <button className="btn btn-primary" onClick={load}>
              Refresh Analytics
            </button>
          </div>
        </div>
      </section>
      <AnalyticsDashboardPanel refreshKey={refreshKey} />
    </main>
  );
}
