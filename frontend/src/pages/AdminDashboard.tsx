import { useState, useEffect, useCallback, useMemo } from 'react';
import { ListChecks, Hourglass, Ambulance, BadgeCheck } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useRealTime } from '../contexts/RealTimeContext';
import { AssistantActionsProvider } from '../contexts/AssistantActionsContext';
import { StatCard } from '../components/StatCard';
import { DispatchQueueTable } from '../components/DispatchQueueTable';
import { RequestDrawer } from '../components/RequestDrawer';
import { ActivityFeed } from '../components/ActivityFeed';
import { ProfessionalsPanel } from '../components/ProfessionalsPanel';
import { CommandPalette } from '../components/CommandPalette';
import { api } from '../services/api';
import { CareRequest } from '../types/index';
import type { AssistantAction } from '../types/assistant';
import '../index.css';

interface DashboardData {
  stats: {
    totalUsers: number;
    totalRequests: number;
    queuedRequests: number;
    offeredRequests: number;
    acceptedRequests: number;
    enRouteRequests: number;
    completedRequests: number;
    cancelledRequests: number;
  };
  userBreakdown: {
    nurses: number;
    doctors: number;
    clients: number;
  };
}

const TABS = ['queued', 'offered', 'accepted', 'en_route', 'completed', 'cancelled'] as const;
type TabFilter = typeof TABS[number];

export function AdminDashboard() {
  const { on } = useRealTime();
  const [data, setData] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CareRequest | null>(null);
  const [tab, setTab] = useState<TabFilter>('queued');
  const [search, setSearch] = useState<string>('');
  const [activityKey, setActivityKey] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [professionals, setProfessionals] = useState<any[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const dash = await api.getAdminDashboard() as any;
      setData(dash?.data);

      const reqs = await api.getAllRequests() as any;
      setRequests(reqs?.data || []);

      const pros = await api.getAllProfessionals() as any;
      setProfessionals(pros?.data || []);

      setActivityKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Subscribe to real-time events
  useEffect(() => {
    const u1 = on('REQUEST_CREATED', loadDashboard);
    const u2 = on('OFFER_CREATED', loadDashboard);
    const u3 = on('OFFER_EXPIRED', loadDashboard);
    const u4 = on('OFFER_ACCEPTED', loadDashboard);
    const u5 = on('OFFER_DECLINED', loadDashboard);
    const u6 = on('REQUEST_STATUS_CHANGED', loadDashboard);
    const u7 = on('VISIT_STATUS_CHANGED', loadDashboard);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); };
  }, [on, loadDashboard]);

  // Handle Ctrl+K (or Cmd+K on Mac) to open command palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (isCtrlOrCmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Filter and sort requests based on active tab
  const tabbed = useMemo(() => {
    return (requests || [])
      .filter((r) => String(r.status).toLowerCase() === tab)
      .sort((a, b) => {
        // offered: soonest expiry first
        if (tab === 'offered') {
          const ae = a.offerExpiresAt ? new Date(a.offerExpiresAt).getTime() : Infinity;
          const be = b.offerExpiresAt ? new Date(b.offerExpiresAt).getTime() : Infinity;
          return ae - be;
        }
        // queued: urgency high first, then oldest first
        const urgRank = (u: any) => ({ critical: 0, high: 1, medium: 2, low: 3 }[String(u).toLowerCase()] ?? 9);
        const ur = urgRank(a.urgency) - urgRank(b.urgency);
        if (ur !== 0) return ur;
        return new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime();
      });
  }, [requests, tab]);

  // Execute assistant actions
  const executeActions = useCallback((actions: AssistantAction[]) => {
    for (const a of actions) {
      if (a.type === 'SET_TAB') {
        setTab(a.tab);
      }
      if (a.type === 'REFRESH_DASHBOARD') {
        loadDashboard();
      }
      if (a.type === 'OPEN_REQUEST') {
        const match = requests.find(
          (r) => r.id.startsWith(a.requestId) || r.id === a.requestId
        );
        if (match) {
          setSelectedRequest(match);
        }
      }
      if (a.type === 'SET_SEARCH') {
        setSearch(a.query);
        setTab('queued');
      }
      if (a.type === 'NAVIGATE') {
        // For now: ignored (no routing to integrations yet)
      }
    }
  }, [loadDashboard, requests]);

  const onRequeue = useCallback(async (requestId: string) => {
    try {
      await api.requeueRequest(requestId);
      loadDashboard();
    } catch (err) {
      console.error('Failed to requeue:', err);
    }
  }, [loadDashboard]);

  const onCancel = useCallback(async (requestId: string) => {
    try {
      await api.cancelRequest(requestId);
      loadDashboard();
    } catch (err) {
      console.error('Failed to cancel:', err);
    }
  }, [loadDashboard]);

  const handleSearchSelect = useCallback((item: any) => {
    if (item?.kind === 'request') {
      const found = (requests || []).find((r) => r.id === item.id);
      if (found) {
        setSelectedRequest(found);
      }
    }
    // Later: implement user navigation etc.
  }, [requests]);

  if (isLoading || !data) {
    return (
      <DashboardLayout>
        <div className="page-center">Loading admin dashboard...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      stats={{
        queuedRequests: data.stats.queuedRequests,
        offeredRequests: data.stats.offeredRequests,
        acceptedRequests: data.stats.acceptedRequests,
        enRouteRequests: data.stats.enRouteRequests,
      }}
      isConnected={true}
      onSearchSelect={handleSearchSelect}
      searchScope="admin"
    >
      <AssistantActionsProvider onActions={executeActions}>
        <main className="dashboardPremium" role="main" aria-label="Admin dashboard">
          <div className="pageHeader">
            <div>
              <h1 className="pageTitle">Admin Dashboard</h1>
              <p className="subtitle">Dispatch and system overview</p>
            </div>
          </div>

          <section className="stats-grid" aria-label="Dashboard statistics">
            <StatCard label="Queued" value={data.stats.queuedRequests} Icon={ListChecks} tone="indigo" hint="Waiting for dispatch" />
            <StatCard label="Offered" value={data.stats.offeredRequests} Icon={Hourglass} tone="amber" hint="Offer pending response" />
            <StatCard label="Active" value={data.stats.acceptedRequests + data.stats.enRouteRequests} Icon={Ambulance} tone="blue" hint="Accepted + en route" />
            <StatCard label="Completed" value={data.stats.completedRequests} Icon={BadgeCheck} tone="green" hint="Visits finished" />
          </section>

          <div className="tabs" role="tablist" aria-label="Request status filters">
            {TABS.map((t) => (
              <button 
                key={t} 
                className={tab === t ? "tab tab-active" : "tab"} 
                onClick={() => setTab(t)}
                role="tab"
                aria-selected={tab === t}
                aria-label={`${t.replace("_"," ").toUpperCase()}: ${(requests || []).filter(r => String(r.status).toLowerCase() === t).length} requests`}
              >
                {t.replace("_"," ").toUpperCase()}
                <span className="tabCount" aria-hidden="true">
                  {(requests || []).filter(r => String(r.status).toLowerCase() === t).length}
                </span>
              </button>
            ))}
          </div>

          <div className="twoCol">
            <div className="mainCol">
              <DispatchQueueTable 
                requests={tabbed} 
                onView={setSelectedRequest}
                onRequeue={onRequeue}
                onCancel={onCancel}
                search={search}
                onSearchChange={setSearch}
              />
            </div>
            <div className="sideCol">
              <div className="sideStack">
                <ActivityFeed refreshKey={activityKey} />
                <ProfessionalsPanel refreshKey={activityKey} />
              </div>
            </div>
          </div>

          <RequestDrawer
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onRefresh={loadDashboard}
          />

          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            activeRequest={selectedRequest}
            onOpenRequest={(requestId: string) => {
              const found = requests.find((r) => r.id === requestId);
              if (found) {
                setSelectedRequest(found);
              }
            }}
            onRefresh={loadDashboard}
            requests={requests}
            professionals={professionals}
          />
        </main>
      </AssistantActionsProvider>
    </DashboardLayout>
  );
}
