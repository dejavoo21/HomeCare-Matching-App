import { useEffect, useMemo, useState } from 'react';
import { AccessRequestsPanel } from '../components/AccessRequestsPanel';
import { TotpSettingsPanel } from '../components/TotpSettingsPanel';
import { api } from '../services/api';
import '../index.css';

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
    <main className="pageStack" role="main" aria-label="Access management page">
      <section className="accessHeroCard">
        <div className="accessHeroGrid">
          <div>
            <div className="accessHeroEyebrow">Access and onboarding control</div>
            <h1 className="accessHeroTitle">Workforce verification hub</h1>
            <p className="accessHeroText">
              Validate identity, credentials, and background requirements before onboarding is
              released into the care operations platform.
            </p>
          </div>

          <div className="accessHeroStats">
            <div className="accessHeroStat">
              <span className="accessHeroStatLabel">Total queue</span>
              <strong className="accessHeroStatValue">{stats.total}</strong>
              <span className="accessHeroStatText">Active verification requests</span>
            </div>
            <div className="accessHeroStat">
              <span className="accessHeroStatLabel">Pending</span>
              <strong className="accessHeroStatValue">{stats.pending}</strong>
              <span className="accessHeroStatText">Awaiting admin review</span>
            </div>
            <div className="accessHeroStat">
              <span className="accessHeroStatLabel">Info requested</span>
              <strong className="accessHeroStatValue">{stats.infoRequested}</strong>
              <span className="accessHeroStatText">Waiting on applicant response</span>
            </div>
            <div className="accessHeroStat">
              <span className="accessHeroStatLabel">Ready</span>
              <strong className="accessHeroStatValue">{stats.verified}</strong>
              <span className="accessHeroStatText">Ready for onboarding release</span>
            </div>
          </div>
        </div>
      </section>

      <section className="accessFunnelGrid" aria-label="Verification funnel">
        <div className="accessFunnelCard accessFunnelCard-warning">
          <div className="accessFunnelLabel">Pending review</div>
          <div className="accessFunnelValue">{stats.pending}</div>
          <div className="accessFunnelText">Requests requiring verification work</div>
        </div>
        <div className="accessFunnelCard accessFunnelCard-info">
          <div className="accessFunnelLabel">Information requested</div>
          <div className="accessFunnelValue">{stats.infoRequested}</div>
          <div className="accessFunnelText">Blocked until applicant provides more information</div>
        </div>
        <div className="accessFunnelCard accessFunnelCard-success">
          <div className="accessFunnelLabel">Verified</div>
          <div className="accessFunnelValue">{stats.verified}</div>
          <div className="accessFunnelText">Ready for onboarding release</div>
        </div>
        <div className="accessFunnelCard accessFunnelCard-danger">
          <div className="accessFunnelLabel">Rejected</div>
          <div className="accessFunnelValue">{stats.rejected}</div>
          <div className="accessFunnelText">Requests closed after review</div>
        </div>
        <div className="accessFunnelCard">
          <div className="accessFunnelLabel">Blocked onboarding</div>
          <div className="accessFunnelValue">{stats.blocked}</div>
          <div className="accessFunnelText">Cannot proceed until required checks are complete</div>
        </div>
      </section>

      <section className="accessHubLayout">
        <div className="accessMainColumn">
          <AccessRequestsPanel refreshKey={refreshKey} hideSummary />
        </div>

        <aside className="accessAsideStack">
          <div className="accessAsideCard">
            <div className="accessAsideTitle">Queue priorities</div>
            <p className="accessAsideText">
              Operational focus areas for the verification team.
            </p>

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
          </div>

          <div className="accessAsideCard">
            <div className="accessAsideTitle">Verification guidance</div>
            <p className="accessAsideText">
              Keep decisions consistent, auditable, and ready for downstream onboarding.
            </p>

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
          </div>

          <TotpSettingsPanel />
        </aside>
      </section>
    </main>
  );
}
