import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppPage from '../components/layout/AppPage';
import PageHero from '../components/ui/PageHero';
import SectionCard from '../components/ui/SectionCard';
import Button from '../components/ui/Button';
import AssistantPanel from '../components/assistant/AssistantPanel';
import RequestWorkspaceTabs, {
  type RequestWorkspaceTabKey,
} from '../components/requests/RequestWorkspaceTabs';
import { api } from '../services/api';
import type { CareRequest } from '../types/index';

export function AdminRequestDetailPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [request, setRequest] = useState<CareRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<RequestWorkspaceTabKey>('overview');
  const requestedTab = searchParams.get('tab');
  const initialTab: RequestWorkspaceTabKey =
    requestedTab === 'thread' ||
    requestedTab === 'timeline' ||
    requestedTab === 'notes' ||
    requestedTab === 'evv'
      ? requestedTab
      : 'overview';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = (await api.getRequestById(String(requestId))) as any;
        if (!cancelled) setRequest(response?.data || response || null);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load request');
          setRequest(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <AppPage>
      <PageHero
        eyebrow="Request operations"
        title="Request detail"
        description="Review the full operational workspace for a single request, including risk, timeline, communication, and controlled actions."
        stats={[
          { label: 'Request', value: request?.id || requestId || '—', subtitle: 'Current request reference' },
          { label: 'Status', value: request?.status || '—', subtitle: 'Operational state' },
          { label: 'Urgency', value: request?.urgency || '—', subtitle: 'Priority posture' },
          { label: 'Assigned', value: request?.assignedProfessionalId || 'No', subtitle: 'Clinician assignment' },
        ]}
        rightContent={
          <div>
            <div className="text-lg font-semibold text-white">Request actions</div>
            <div className="mt-3 space-y-3">
              <button className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm hover:bg-white/15">
                Open thread
              </button>
              <button className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm hover:bg-white/15">
                Review timeline
              </button>
              <button className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm hover:bg-white/15">
                Manage dispatch action
              </button>
            </div>
          </div>
        }
      />

      {loading ? (
        <SectionCard title="Loading request detail">
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </SectionCard>
      ) : error ? (
        <SectionCard title="Failed to load request detail">
          <div className="space-y-3">
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
            <Button variant="secondary" onClick={() => navigate('/admin/requests')}>
              Back to Request Queue
            </Button>
          </div>
        </SectionCard>
      ) : request ? (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <RequestWorkspaceTabs
              request={request}
              compact={false}
              initialTab={initialTab}
              onTabChange={setActiveTab}
            />
          </div>

          <div className="space-y-6">
            <AssistantPanel
              context="dispatch"
              contextData={{ page: 'request_detail', requestId: request.id, tab: activeTab }}
            />

            <SectionCard title="Workspace guidance">
              <div className="space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Use Overview for current posture and actions, Thread for coordination, Timeline for traceability, Notes for operational context, and EVV for visit verification posture.
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}
    </AppPage>
  );
}
