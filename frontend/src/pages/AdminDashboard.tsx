import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useRealTime } from '../contexts/RealTimeContext';
import { DispatchQueueTable } from '../components/DispatchQueueTable';
import { RequestDrawer } from '../components/RequestDrawer';
import { ActivityFeed } from '../components/ActivityFeed';
import { ProfessionalsPanel } from '../components/ProfessionalsPanel';
import { api } from '../services/api';
import { CareRequest } from '../types/index';
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
  const { on, state } = useRealTime();

  const [data, setData] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [connectedSystems, setConnectedSystems] = useState<any[]>([]);
  const [webhookDeliveries, setWebhookDeliveries] = useState<any[]>([]);
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CareRequest | null>(null);
  const [tab, setTab] = useState<TabFilter>('queued');
  const [activityKey, setActivityKey] = useState(0);
  const [search, setSearch] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);

      const [dash, reqs] = await Promise.all([
        api.getAdminDashboard() as any,
        api.getAllRequests() as any,
      ]);

      setData(dash?.data || null);
      setRequests(reqs?.data || []);

      try {
        const [systems, deliveries, access] = await Promise.all([
          api.getConnectedSystems() as any,
          api.getWebhookDeliveries(50) as any,
          api.getAccessRequests() as any,
        ]);
        setConnectedSystems(systems?.data || []);
        setWebhookDeliveries(deliveries?.data || []);
        setAccessRequests(access?.data || []);
      } catch {
        setConnectedSystems([]);
        setWebhookDeliveries([]);
        setAccessRequests([]);
      }

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

  useEffect(() => {
    const unsubs = [
      on('REQUEST_CREATED', loadDashboard),
      on('OFFER_CREATED', loadDashboard),
      on('OFFER_EXPIRED', loadDashboard),
      on('OFFER_ACCEPTED', loadDashboard),
      on('OFFER_DECLINED', loadDashboard),
      on('REQUEST_STATUS_CHANGED', loadDashboard),
      on('VISIT_STATUS_CHANGED', loadDashboard),
      on('ACCESS_REQUEST_APPROVED', loadDashboard),
      on('ACCESS_REQUEST_REJECTED', loadDashboard),
    ];

    return () => unsubs.forEach((u) => u());
  }, [on, loadDashboard]);

  const handleSearchSelect = async (item: any) => {
    try {
      if (item.kind === 'request') {
        const found = (requests || []).find((r) => r.id === item.id);
        if (found) {
          setSelectedRequest(found);
          return;
        }
        const resp = (await api.getRequestById(item.id)) as any;
        if (resp?.data) setSelectedRequest(resp.data);
      }
    } catch (err) {
      console.error('Search selection failed:', err);
    }
  };

  const onOffer = async (requestId: string) => {
    const found = (requests || []).find((r) => r.id === requestId);
    if (found) setSelectedRequest(found);
  };

  const onRequeue = async (id: string) => {
    try {
      await api.requeueRequest(id);
      await loadDashboard();
    } catch (err) {
      console.error('Requeue failed:', err);
    }
  };

  const onCancel = async (id: string) => {
    try {
      await api.cancelRequest(id);
      await loadDashboard();
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  const onSetUrgency = async (id: string, urgency: string) => {
    try {
      await api.setUrgency(id, urgency);
      await loadDashboard();
    } catch (err) {
      console.error('Set urgency failed:', err);
    }
  };

  const tabbed = useMemo(() => {
    return (requests || [])
      .filter((r) => String(r.status).toLowerCase() === tab)
      .sort((a, b) => {
        if (tab === 'offered') {
          const ae = a.offerExpiresAt ? new Date(a.offerExpiresAt).getTime() : Infinity;
          const be = b.offerExpiresAt ? new Date(b.offerExpiresAt).getTime() : Infinity;
          return ae - be;
        }
        const urgRank = (u: any) =>
          ({ critical: 0, high: 1, medium: 2, low: 3 }[String(u).toLowerCase()] ?? 9);
        const ur = urgRank(a.urgency) - urgRank(b.urgency);
        if (ur !== 0) return ur;
        return new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime();
      });
  }, [requests, tab]);

  const statusCounts = useMemo(() => {
    const getCount = (...statuses: string[]) =>
      (requests || []).filter((r) => statuses.includes(String(r.status).toLowerCase())).length;

    return {
      queued: getCount('queued'),
      offered: getCount('offered'),
      accepted: getCount('accepted'),
      enroute: getCount('en_route', 'enroute'),
      completed: getCount('completed'),
      cancelled: getCount('cancelled'),
    };
  }, [requests]);

  const offersExpiringSoon = useMemo(
    () =>
      (requests || []).filter((r) => {
        if (!r.offerExpiresAt || String(r.status).toLowerCase() !== 'offered') return false;
        const diff = new Date(r.offerExpiresAt).getTime() - Date.now();
        return diff > 0 && diff <= 5 * 60 * 1000;
      }).length,
    [requests]
  );

  const pendingAccessCount = useMemo(
    () => (accessRequests || []).filter((x) => String(x.status).toLowerCase() === 'pending').length,
    [accessRequests]
  );

  const failedSystems = useMemo(
    () => (connectedSystems || []).filter((x) => String(x.status).toLowerCase() === 'failed').length,
    [connectedSystems]
  );

  const failingDeliveries = useMemo(
    () =>
      (webhookDeliveries || []).filter((x) => {
        const s = String(x.status).toLowerCase();
        return s === 'failed' || s === 'dead';
      }).length,
    [webhookDeliveries]
  );

  if (isLoading || !data) {
    return (
      <DashboardLayout
        stats={{
          queuedRequests: 0,
          offeredRequests: 0,
          acceptedRequests: 0,
          enRouteRequests: 0,
        }}
        isConnected={state === 'connected'}
        onSearchSelect={handleSearchSelect}
        searchScope="admin"
      >
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
      isConnected={state === 'connected'}
      onSearchSelect={handleSearchSelect}
      searchScope="admin"
    >
      <main className="dashboardPremium" role="main" aria-label="Admin dashboard">
        <section className="heroBlock">
          <div className="heroContent">
            <div>
              <h1 className="pageTitle">Admin Dashboard</h1>
              <p className="subtitle">Dispatch, governance, analytics, and connected systems</p>
            </div>

            <div className="heroActions">
              <button className="btn btn-primary" onClick={loadDashboard}>
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="opsTilesGrid" aria-label="Operational status">
          <article className="opsTile">
            <p className="opsTileLabel">Dispatch Queue</p>
            <p className="opsTileValue">{statusCounts.queued}</p>
            <p className="opsTileHint">Queued requests waiting dispatch</p>
          </article>
          <article className="opsTile">
            <p className="opsTileLabel">Offers Pending</p>
            <p className="opsTileValue">{statusCounts.offered}</p>
            <p className="opsTileHint">Awaiting professional response</p>
          </article>
          <article className="opsTile">
            <p className="opsTileLabel">Visits In Progress</p>
            <p className="opsTileValue">{statusCounts.accepted + statusCounts.enroute}</p>
            <p className="opsTileHint">Accepted + en route</p>
          </article>
          <article className="opsTile">
            <p className="opsTileLabel">Completed Today</p>
            <p className="opsTileValue">{statusCounts.completed}</p>
            <p className="opsTileHint">Finished visits</p>
          </article>
        </section>

        <section className="dashboardGridTwo">
          <article className="opsPanel">
            <h2 className="opsPanelTitle">Dispatch Pipeline</h2>
            <div className="pipelineRow">
              <span className="pipelineNode">Queued <b>{statusCounts.queued}</b></span>
              <span className="pipelineArrow">→</span>
              <span className="pipelineNode">Offered <b>{statusCounts.offered}</b></span>
              <span className="pipelineArrow">→</span>
              <span className="pipelineNode">Accepted <b>{statusCounts.accepted}</b></span>
              <span className="pipelineArrow">→</span>
              <span className="pipelineNode">En Route <b>{statusCounts.enroute}</b></span>
              <span className="pipelineArrow">→</span>
              <span className="pipelineNode">Completed <b>{statusCounts.completed}</b></span>
            </div>
          </article>

          <article className="opsPanel">
            <h2 className="opsPanelTitle">System Health</h2>
            <ul className="healthList">
              <li className="healthOk">Dispatch Engine: Healthy</li>
              <li className={state === 'connected' ? 'healthOk' : 'healthWarn'}>
                Realtime Events: {state === 'connected' ? 'Connected' : 'Sync unavailable'}
              </li>
              <li className={failedSystems > 0 ? 'healthWarn' : 'healthOk'}>
                Hospital Integrations: {failedSystems > 0 ? `${failedSystems} failing` : 'Healthy'}
              </li>
              <li className={failingDeliveries > 0 ? 'healthWarn' : 'healthOk'}>
                Webhooks: {failingDeliveries > 0 ? `${failingDeliveries} retrying/failed` : 'Healthy'}
              </li>
            </ul>
          </article>
        </section>

        <section className="opsAttention">
          <h2 className="opsPanelTitle">Attention Items</h2>
          <ul className="attentionList">
            <li>{offersExpiringSoon} offers expiring soon</li>
            <li>{failedSystems} connected systems failing</li>
            <li>{failingDeliveries} webhook deliveries failing/retrying</li>
            <li>{pendingAccessCount} access requests pending review</li>
          </ul>
        </section>

        <section className="dashboardSection">
          <div className="tabs" role="tablist" aria-label="Request status filters">
            {TABS.map((t) => (
              <button
                key={t}
                className={tab === t ? 'tab tab-active' : 'tab'}
                onClick={() => setTab(t)}
                role="tab"
                aria-selected={tab === t}
              >
                {t.replace('_', ' ').toUpperCase()}
                <span className="tabCount">
                  {(requests || []).filter((r) => String(r.status).toLowerCase() === t).length}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="dashboardSection twoCol">
          <div className="mainCol">
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

          <aside className="sideCol">
            <div className="sideStack">
              <ActivityFeed refreshKey={activityKey} />
              <ProfessionalsPanel refreshKey={activityKey} />
            </div>
          </aside>
        </section>

        <RequestDrawer
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onRefresh={loadDashboard}
        />
      </main>
    </DashboardLayout>
  );
}
