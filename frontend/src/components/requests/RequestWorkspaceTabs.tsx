import { useEffect, useMemo, useState } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import SectionCard from '../ui/SectionCard';
import ProtectedAction from '../auth/ProtectedAction';
import { PERMISSIONS } from '../../lib/auth/permissions';
import RequestThreadPanel from './RequestThreadPanel';
import type { CareRequest } from '../../types/index';

export type RequestWorkspaceTabKey =
  | 'overview'
  | 'thread'
  | 'timeline'
  | 'notes'
  | 'evv';

function formatDateTime(value?: string | Date) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function urgencyVariant(value?: string) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'critical') return 'danger';
  if (normalized === 'high') return 'warning';
  if (normalized === 'medium') return 'info';
  return 'neutral';
}

function statusVariant(value?: string) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'queued') return 'info';
  if (normalized === 'offered') return 'warning';
  if (normalized === 'accepted' || normalized === 'completed') return 'success';
  if (normalized === 'cancelled') return 'danger';
  if (normalized === 'en_route') return 'violet';
  return 'neutral';
}

function riskVariant(request: CareRequest) {
  const urgency = String(request.urgency || '').toLowerCase();
  if (urgency === 'critical') return 'danger';
  if (urgency === 'high' || request.offerExpiresAt) return 'warning';
  return 'success';
}

function buildTimeline(request: CareRequest) {
  const timeline: Array<{ id: string; label: string; at: Date | string | undefined }> = [
    { id: 'created', label: 'Request created', at: request.createdAt },
    { id: 'scheduled', label: 'Scheduled for service window', at: request.scheduledDateTime },
    { id: 'updated', label: 'Most recent request update', at: request.updatedAt },
  ];

  if (request.offerExpiresAt) {
    timeline.splice(2, 0, {
      id: 'offer',
      label: 'Offer currently active',
      at: request.offerExpiresAt,
    });
  }

  return timeline;
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={[
        'flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition',
        active
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-slate-500 hover:text-slate-700',
      ].join(' ')}
    >
      <span>{label}</span>
      {typeof count === 'number' ? (
        <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function RequestHeader({
  request,
  compact,
}: {
  request: CareRequest;
  compact: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Request workspace</p>
        <h1 className={compact ? 'mt-1 text-xl font-bold text-slate-900' : 'mt-1 text-2xl font-bold text-slate-900'}>
          {request.description || request.serviceType}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {String(request.serviceType).replace(/_/g, ' ')} | {request.address} |{' '}
          {formatDateTime(request.scheduledDateTime)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={statusVariant(String(request.status))}>{String(request.status).replace('_', ' ')}</Badge>
        <Badge variant={urgencyVariant(String(request.urgency))}>{String(request.urgency)}</Badge>
        <Badge variant={riskVariant(request)}>EVV risk</Badge>
      </div>
    </div>
  );
}

function OverviewTab({
  request,
  compact,
  onOpenFullPage,
  onClose,
  onOpenThread,
}: {
  request: CareRequest;
  compact: boolean;
  onOpenFullPage?: () => void;
  onClose?: () => void;
  onOpenThread?: () => void;
}) {
  const riskSummary = request.offerExpiresAt
    ? 'Offer is active and requires timely resolution to avoid queue stall.'
    : request.assignedProfessionalId
      ? 'A clinician is assigned, but dispatch should continue monitoring status progression.'
      : 'No clinician is assigned yet. Coverage and urgency should be reviewed immediately.';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Client</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">{request.clientId}</div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Assigned clinician</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {request.assignedProfessionalId || 'Not assigned'}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Offer</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {request.offerExpiresAt ? 'Active offer' : 'No active offer'}
          </div>
          {request.offerExpiresAt ? (
            <div className="mt-1 text-xs text-slate-500">Expires {formatDateTime(request.offerExpiresAt)}</div>
          ) : null}
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Request ID</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">{request.id}</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard title="Service risk summary">
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
              {riskSummary}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {request.offerExpiresAt ? <Badge variant="warning">offer live</Badge> : null}
              {String(request.urgency).toLowerCase() === 'critical' ? (
                <Badge variant="danger">critical priority</Badge>
              ) : null}
              {!request.assignedProfessionalId ? <Badge variant="info">unassigned</Badge> : null}
            </div>
          </SectionCard>

          <SectionCard title="Operational posture">
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Service type: <span className="font-semibold text-slate-900">{String(request.serviceType).replace(/_/g, ' ')}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Scheduled window: <span className="font-semibold text-slate-900">{formatDateTime(request.scheduledDateTime)}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Thread activity: <span className="font-semibold text-slate-900">Open the Thread tab for work-linked updates</span>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Actions">
            <div className="space-y-3">
              {onOpenThread ? (
                <Button variant="secondary" onClick={onOpenThread}>
                  Open request thread
                </Button>
              ) : null}

              <ProtectedAction
                permission={PERMISSIONS.DISPATCH_MANAGE}
                variant="secondary"
                onClick={() => {}}
                deniedReason="Only dispatch staff can manage offers."
              >
                Manage offer
              </ProtectedAction>

              <ProtectedAction
                permission={PERMISSIONS.DISPATCH_MANAGE}
                variant="warning"
                onClick={() => {}}
                deniedReason="Only dispatch coordinators can reassign coverage."
              >
                Reassign coverage
              </ProtectedAction>

              <ProtectedAction
                permission={PERMISSIONS.DISPATCH_MANAGE}
                variant="danger"
                onClick={() => {}}
                deniedReason="Only authorized dispatch staff can cancel requests."
              >
                Cancel request
              </ProtectedAction>

              {compact && onOpenFullPage ? (
                <Button variant="secondary" onClick={onOpenFullPage}>
                  Open full page
                </Button>
              ) : null}

              {compact && onClose ? (
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function TimelineTab({ request }: { request: CareRequest }) {
  const timeline = buildTimeline(request);
  return (
    <SectionCard title="Timeline">
      <div className="space-y-3">
        {timeline.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="text-sm font-semibold text-slate-900">{item.label}</div>
            <div className="mt-1 text-xs text-slate-500">{formatDateTime(item.at)}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function NotesTab({ request }: { request: CareRequest }) {
  return (
    <SectionCard title="Operational notes">
      <div className="space-y-3">
        <div className="rounded-2xl bg-slate-50 px-4 py-4">
          <div className="text-sm font-semibold text-slate-900">Request description</div>
          <div className="mt-2 text-sm text-slate-700">{request.description || 'No description provided.'}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-4">
          <div className="text-sm font-semibold text-slate-900">Address</div>
          <div className="mt-2 text-sm text-slate-700">{request.address}</div>
        </div>
      </div>
    </SectionCard>
  );
}

function EvvTab({ request }: { request: CareRequest }) {
  return (
    <SectionCard title="EVV posture">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 px-4 py-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">GPS ready</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">Available in EVV panel</div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Check-in status</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">{String(request.status).replace('_', ' ')}</div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">EVV risk</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">{riskVariant(request)}</div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Scheduled time</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(request.scheduledDateTime)}</div>
        </div>
      </div>
    </SectionCard>
  );
}

export default function RequestWorkspaceTabs({
  request,
  compact = false,
  initialTab = 'overview',
  onClose,
  onOpenFullPage,
  onTabChange,
}: {
  request: CareRequest;
  compact?: boolean;
  initialTab?: RequestWorkspaceTabKey;
  onClose?: () => void;
  onOpenFullPage?: () => void;
  onTabChange?: (tab: RequestWorkspaceTabKey) => void;
}) {
  const [activeTab, setActiveTab] = useState<RequestWorkspaceTabKey>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  const tabCounts = useMemo(
    () => ({
      timeline: buildTimeline(request).length,
      notes: 2,
      thread: 0,
    }),
    [request]
  );

  return (
    <div className="space-y-6">
      <RequestHeader request={request} compact={compact} />

      <div className="flex flex-wrap gap-6 border-b border-slate-200">
        <TabButton label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabButton label="Thread" count={tabCounts.thread} active={activeTab === 'thread'} onClick={() => setActiveTab('thread')} />
        <TabButton label="Timeline" count={tabCounts.timeline} active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} />
        <TabButton label="Notes" count={tabCounts.notes} active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
        <TabButton label="EVV" active={activeTab === 'evv'} onClick={() => setActiveTab('evv')} />
      </div>

      {activeTab === 'overview' ? (
        <OverviewTab
          request={request}
          compact={compact}
          onOpenFullPage={onOpenFullPage}
          onClose={onClose}
          onOpenThread={() => setActiveTab('thread')}
        />
      ) : null}

      {activeTab === 'thread' ? (
        <RequestThreadPanel requestId={request.id} compact={compact} showComposer />
      ) : null}

      {activeTab === 'timeline' ? <TimelineTab request={request} /> : null}
      {activeTab === 'notes' ? <NotesTab request={request} /> : null}
      {activeTab === 'evv' ? <EvvTab request={request} /> : null}
    </div>
  );
}
