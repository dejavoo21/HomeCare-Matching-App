import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { AccessRequestsPanel } from '../components/AccessRequestsPanel';
import { api } from '../services/api';
import '../index.css';

interface DashboardData {
  stats: {
    queuedRequests: number;
    offeredRequests: number;
    acceptedRequests: number;
    enRouteRequests: number;
  };
}

export function AdminAccessRequestsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const dash = (await api.getAdminDashboard()) as any;
      setData(dash?.data || null);
      setRefreshKey((k) => k + 1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading || !data) {
    return (
      <DashboardLayout>
        <div className="page-center">Loading admin access requests...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      stats={data.stats}
      isConnected={true}
      searchScope="admin"
    >
      <main className="dashboardPremium" role="main" aria-label="Access requests">
        <header className="headerCard">
          <div className="headerLeft">
            <h1 className="pageTitle">Access Requests</h1>
            <p className="subtitle">Review and approve onboarding access</p>
          </div>
          <div className="headerRight">
            <button className="btn btnSoft" onClick={load}>
              Refresh
            </button>
          </div>
        </header>

        <div className="adminSingleCol">
          <AccessRequestsPanel refreshKey={refreshKey} />
        </div>
      </main>
    </DashboardLayout>
  );
}
