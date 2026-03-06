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
import { AccessRequestsPanel } from '../components/AccessRequestsPanel';
import { AuditPanel } from '../components/AuditPanel';
import { Toast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
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

type ConfirmState =
  | { open: false }
  | { open: true; title: string; message: string; onConfirm: () => Promise<void>; tone?: 'danger' | 'primary' };

export function AdminDashboard() {
  const { on } = useRealTime();
  const [data, setData] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CareRequest | null>(null);
  const [tab, setTab] = useState<TabFilter>('queued');
  const [search, setSearch] = useState<string>('');
  const [activityKey, setActivityKey] = useState(0);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [toast, setToast] = useState<{ msg: string; tone?: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((msg: string, tone: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, tone });
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const dash = await api.getAdminDashboard() as any;
      setData(dash?.data);

      const reqs = await api.getAllRequests() as any;
      setRequests(reqs?.data || []);

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

  // Handle Ctrl+K (or Cmder and sort requests based on active tab
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
    setConfirm({
      open: true,
      title: 'Requeue request?',
      message: 'This will move the request back to QUEUED and expire any active offer.',
      tone: 'primary',
      onConfirm: async () => {
        try {
          await api.requeueRequest(requestId);
          showToast('Requeued successfully ✅', 'success');
          await loadDashboard();
        } catch (e: any) {
          showToast(e?.message || 'Failed to requeue', 'error');
        }
      },
    });
  }, [loadDashboard, showToast]);

  const onCancel = useCallback(async (requestId: string) => {
    setConfirm({
      open: true,
      title: 'Cancel request?',
      message: 'This will mark the request as CANCELLED and stop dispatch.',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await api.cancelRequest(requestId);
          showToast('Cancelled successfully ✅', 'success');
          await loadDashboard();
        } catch (e: any) {
          showToast(e?.message || 'Failed to cancel', 'error');
        }
      },
    });
  }, [loadDashboard, showToast]);

  const onSetUrgency = useCallback(async (requestId: string, urgency: string) => {
    try {
      await api.setUrgency(requestId, urgency);
      showToast(`Urgency → ${urgency.toUpperCase()}`, 'info');
      await loadDashboard();
    } catch (e: any) {
      showToast(e?.message || 'Failed to set urgency', 'error');
    }
  }, [loadDashboard, showToast]);

  const onOffer = useCallback(async (requestId: string) => {
    // Find and select the request, which will open the drawer
    const found = (requests || []).find((r) => r.id === requestId);
    if (found) {
      setSelectedRequest(found);
    }
  }, [requests]);

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
      paletteContextRequestId={selectedRequest?.id || null}
    >
      <AssistantActionsProvider onActions={executeActions}>
        <main className="dashboardPremium" role="main" aria-label="Admin dashboard">

          {/* ===== Header Card ===== */}
          <header className="headerCard">
            <div className="headerLeft">
              <h1 className="pageTitle">Admin Dashboard</h1>
              <p className="subtitle">Dispatch and system overview</p>
            </div>

            <div className="headerRight">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  const searchInput = document.querySelector('input[placeholder="Search requests, users, events..."]') as HTMLInputElement | null;
                  if (searchInput) searchInput.focus();
                }}
                title="Open search (Ctrl+K)"
              >
                🔍 Search
              </button>
              <button className="btn btnSoft" onClick={loadDashboard}>
                Refresh
              </button>
            </div>
          </header>

          {/* ===== Stats ===== */}
          <section className="stats-grid" aria-label="Dashboard statistics">
            <StatCard label="Queued" value={data.stats.queuedRequests} Icon={ListChecks} tone="indigo" hint="Waiting for dispatch" />
            <StatCard label="Offered" value={data.stats.offeredRequests} Icon={Hourglass} tone="amber" hint="Offer pending response" />
            <StatCard label="Active" value={data.stats.acceptedRequests + data.stats.enRouteRequests} Icon={Ambulance} tone="blue" hint="Accepted + en route" />
            <StatCard label="Completed" value={data.stats.completedRequests} Icon={BadgeCheck} tone="green" hint="Visits finished" />
          </section>

          {/* ===== Tabs in a pill bar ===== */}
          <section className="tabsCard" aria-label="Request status filters">
            <div className="tabs" role="tablist">
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
          </section>

          {/* ===== Main grid ===== */}
          <div className="twoCol">
            <div className="mainCol">
              <div className="cardShell">
                <div className="cardHeader">
                  <div>
                    <h2 className="cardTitle">Dispatch Queue</h2>
                    <p className="cardSub">Filter, search, and take actions in real time.</p>
                  </div>
                </div>

                <div className="cardBody">
                  <DispatchQueueTable 
                    requests={tabbed} 
                    onView={setSelectedRequest}
                    onOffer={onOffer}
                    onRequeue={onRequeue}
                    onCancel={onCancel}
                    onSetUrgency={onSetUrgency}
                    search={search}
                    onSearchChange={setSearch}
                  />
                </div>
              </div>
            </div>

            <aside className="sideCol" aria-label="Right sidebar">
              <div className="sideStack">
                <ActivityFeed refreshKey={activityKey} />
                <ProfessionalsPanel refreshKey={activityKey} />
                <AccessRequestsPanel refreshKey={activityKey} />
                <AuditPanel refreshKey={activityKey} />
              </div>
            </aside>
          </div>

          <RequestDrawer
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onRefresh={loadDashboard}
          />
        </main>

        {confirm.open && (
          <ConfirmDialog
            open={confirm.open}
            title={confirm.title}
            message={confirm.message}
            tone={confirm.tone === 'primary' ? 'primary' : 'danger'}
            confirmText="Yes"
            cancelText="No"
            onConfirm={() => confirm.onConfirm()}
            onClose={() => setConfirm({ open: false })}
          />
        )}

        {toast && (
          <Toast
            message={toast.msg}
            tone={toast.tone || 'success'}
            onClose={() => setToast(null)}
          />
        )}
      </AssistantActionsProvider>
    </DashboardLayout>
  );
}
