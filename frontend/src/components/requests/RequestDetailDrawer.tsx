import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import SectionCard from '../ui/SectionCard';
import Button from '../ui/Button';
import RequestDetailContent from './RequestDetailContent';
import { RequestChatDrawer } from '../RequestChatDrawer';
import type { CareRequest } from '../../types/index';

export default function RequestDetailDrawer({
  requestId,
  open,
  onClose,
}: {
  requestId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [request, setRequest] = useState<CareRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [threadOpen, setThreadOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || !requestId) return;

    let cancelled = false;

    async function load() {
      if (!requestId) return;
      setLoading(true);
      setError('');
      try {
        const response = (await api.getRequestById(requestId)) as any;
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
  }, [open, requestId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40">
      <div className="absolute inset-y-0 right-0 w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Request workspace</div>
              <div className="mt-1 text-sm text-slate-500">
                Quick detail view for live dispatch coordination
              </div>
            </div>

            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <SectionCard title="Loading request">
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            </SectionCard>
          ) : error ? (
            <SectionCard title="Failed to load request">
              <div className="space-y-3">
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {error}
                </div>
                <Button variant="secondary" onClick={onClose}>
                  Close drawer
                </Button>
              </div>
            </SectionCard>
          ) : request ? (
            <RequestDetailContent
              request={request}
              compact
              onClose={onClose}
              onOpenThread={() => setThreadOpen(true)}
              onOpenFullPage={() => navigate(`/admin/requests/${request.id}`)}
            />
          ) : null}
        </div>
      </div>

      <RequestChatDrawer
        open={threadOpen}
        requestId={requestId}
        onClose={() => setThreadOpen(false)}
      />
    </div>
  );
}
