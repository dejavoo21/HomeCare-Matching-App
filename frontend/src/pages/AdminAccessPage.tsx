import { useEffect, useMemo, useState } from 'react';
import { AccessRequestsPanel } from '../components/AccessRequestsPanel';
import { TotpSettingsPanel } from '../components/TotpSettingsPanel';
import AppPage from '../components/layout/AppPage';
import TwoColumnPage from '../components/layout/TwoColumnPage';
import KpiCard from '../components/ui/KpiCard';
import PageHero from '../components/ui/PageHero';
import SectionCard from '../components/ui/SectionCard';
import { api } from '../services/api';

type AccessSummaryRow = {
  status: string;
  additional_info_requested?: boolean;
  verification_completed?: boolean;
  requested_role?: string;
};

export function AdminAccessPage() {
  const [refreshKey] = useState(1);
  const [items, setItems] = useState<AccessSummaryRow[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = (await api.getAccessRequests()) as any;
        if (mounted) {
          setItems(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (err) {
        console.error('Failed to load access summary:', err);
        if (mounted) {
          setItems([]);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const stats = useMemo(() => {
    const pending = items.filter((item) => item.status === 'pending').length;
    const infoRequested = items.filter((item) => item.additional_info_requested).length;
    const verified = items.filter((item) => item.verification_completed).length;
    const rejected = items.filter((item) => item.status === 'rejected').length;
    const blocked = items.filter(
      (item) =>
        !item.verification_completed && String(item.requested_role || '').toLowerCase() !== 'client'
    ).length;

    return {
      total: items.length,
      pending,
      infoRequested,
      verified,
      rejected,
      blocked,
    };
  }, [items]);

  return (
    <AppPage>
      <PageHero
        eyebrow="Access and onboarding control"
        title="Workforce verification hub"
        description="Validate identity, credentials, and background requirements before onboarding is released into the care operations platform."
        stats={[
          { label: 'Total queue', value: stats.total, subtitle: 'Active verification requests' },
          { label: 'Pending', value: stats.pending, subtitle: 'Awaiting admin review' },
          { label: 'Info requested', value: stats.infoRequested, subtitle: 'Waiting on applicant response' },
          { label: 'Ready', value: stats.verified, subtitle: 'Ready for onboarding release' },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Verification funnel">
        <KpiCard
          title="Pending review"
          value={stats.pending}
          subtitle="Requests requiring verification work"
          accent="warning"
        />
        <KpiCard
          title="Information requested"
          value={stats.infoRequested}
          subtitle="Blocked until applicant provides more information"
          accent="info"
        />
        <KpiCard
          title="Verified"
          value={stats.verified}
          subtitle="Ready for onboarding release"
          accent="success"
        />
        <KpiCard
          title="Rejected"
          value={stats.rejected}
          subtitle="Requests closed after review"
          accent="danger"
        />
        <KpiCard
          title="Blocked onboarding"
          value={stats.blocked}
          subtitle="Cannot proceed until required checks are complete"
          accent="default"
        />
      </section>

      <TwoColumnPage
        left={<AccessRequestsPanel refreshKey={refreshKey} hideSummary />}
        right={
          <>
            <SectionCard
              title="Queue priorities"
              subtitle="Operational focus areas for the verification team"
            >
              <div className="accessAsideList">
                <div className="accessAsideItem accessAsideItem-warning">
                  {stats.pending} request{stats.pending === 1 ? '' : 's'} awaiting verification review
                </div>
                <div className="accessAsideItem accessAsideItem-info">
                  {stats.infoRequested} request{stats.infoRequested === 1 ? '' : 's'} blocked pending more information
                </div>
                <div className="accessAsideItem">
                  {stats.blocked} applicant{stats.blocked === 1 ? '' : 's'} currently blocked from onboarding
                </div>
                <div className="accessAsideItem accessAsideItem-success">
                  {stats.verified} applicant{stats.verified === 1 ? '' : 's'} ready for onboarding release
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Verification guidance"
              subtitle="Keep decisions consistent, auditable, and ready for downstream onboarding"
            >
              <div className="accessAsideList">
                <div className="accessAsideItem">
                  Verify identity, license, compliance, and background checks before release.
                </div>
                <div className="accessAsideItem">
                  Use structured information requests instead of informal follow-ups.
                </div>
                <div className="accessAsideItem">
                  Record internal notes to preserve audit traceability and operational continuity.
                </div>
              </div>
            </SectionCard>

            <TotpSettingsPanel />
          </>
        }
      />
    </AppPage>
  );
}
