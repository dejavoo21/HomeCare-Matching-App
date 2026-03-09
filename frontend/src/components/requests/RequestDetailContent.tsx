import Badge from '../ui/Badge';
import Button from '../ui/Button';
import SectionCard from '../ui/SectionCard';
import ProtectedAction from '../auth/ProtectedAction';
import { PERMISSIONS } from '../../lib/auth/permissions';
import type { CareRequest } from '../../types/index';

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
  if (['accepted', 'completed'].includes(normalized)) return 'success';
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

function formatDate(value?: string | Date) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
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

export default function RequestDetailContent({
  request,
  compact = false,
  onClose,
  onOpenThread,
  onOpenFullPage,
}: {
  request: CareRequest;
  compact?: boolean;
  onClose?: () => void;
  onOpenThread?: () => void;
  onOpenFullPage?: () => void;
}) {
  const timeline = buildTimeline(request);
  const riskSummary = request.offerExpiresAt
    ? 'Offer is active and requires timely resolution to avoid queue stall.'
    : request.assignedProfessionalId
      ? 'A clinician is assigned, but dispatch should continue monitoring status progression.'
      : 'No clinician is assigned yet. Coverage and urgency should be reviewed immediately.';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Request detail</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {request.description || request.serviceType}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {String(request.serviceType).replace(/_/g, ' ')} | {request.address} |{' '}
            {formatDate(request.scheduledDateTime)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={statusVariant(String(request.status))}>{String(request.status).replace('_', ' ')}</Badge>
          <Badge variant={urgencyVariant(String(request.urgency))}>{String(request.urgency)}</Badge>
          <Badge variant={riskVariant(request)}>Service risk</Badge>
        </div>
      </div>

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
            <div className="mt-1 text-xs text-slate-500">Expires {formatDate(request.offerExpiresAt)}</div>
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

          <SectionCard title="Timeline">
            <div className="space-y-3">
              {timeline.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDate(item.at)}</div>
                </div>
              ))}
            </div>
          </SectionCard>

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
        </div>

        <div className="space-y-6">
          <SectionCard title="Actions">
            <div className="space-y-3">
              <Button variant="secondary" onClick={onOpenThread}>
                Open request thread
              </Button>

              <ProtectedAction
                permission={PERMISSIONS.DISPATCH_MANAGE}
                variant="secondary"
                onClick={() => {}}
                deniedReason="Only dispatch staff can issue or manage offers."
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

          <SectionCard title="EVV posture">
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                GPS ready: <span className="font-semibold text-slate-900">Available in EVV panel</span>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Scheduled window: <span className="font-semibold text-slate-900">{formatDate(request.scheduledDateTime)}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Current status: <span className="font-semibold text-slate-900">{String(request.status).replace('_', ' ')}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
