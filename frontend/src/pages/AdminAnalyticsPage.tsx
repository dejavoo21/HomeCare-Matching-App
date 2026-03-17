import { useCallback, useEffect, useState } from 'react';
import AppPage from '../components/layout/AppPage';
import { AnalyticsDashboardPanel } from '../components/AnalyticsDashboardPanel';
import AdminPageHeader from '../components/ui/AdminPageHeader';
import AdminStatStrip from '../components/ui/AdminStatStrip';

export function AdminAnalyticsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppPage className="analyticsPage">
      <section className="analyticsTopGrid" aria-label="Analytics overview">
        <AdminPageHeader
          eyebrow="Operational analytics"
          title="Care operations analytics"
          description="Measure service delivery performance, workforce activity, review throughput, and operational risk patterns."
        >
          <AdminStatStrip
            items={[
              { label: 'Visits completed', value: '3,482', meta: 'Tracked care delivery volume' },
              { label: 'Completion rate', value: '97%', meta: 'Visit completion confidence' },
              { label: 'Review cycle', value: '1.4d', meta: 'Average admin review time' },
              { label: 'Review backlog', value: '11', meta: 'Pending clinician note reviews' },
            ]}
          />
        </AdminPageHeader>

        <div className="analyticsControlStack">
          <div className="analyticsControlCard">
            <div className="analyticsControlTitle">Analytics controls</div>
            <div className="analyticsControlText">
              Refresh executive metrics and operational trends for the current reporting window.
            </div>

            <div className="mt-4">
              <button className="btn btn-primary" onClick={load}>
                Refresh analytics
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="analyticsSurfaceCard" aria-label="Operational analytics surface">
        <div className="analyticsSurfaceHeader">
          <div>
            <div className="analyticsSurfaceTitle">Operational analytics surface</div>
            <div className="analyticsSurfaceSubtitle">Delivery, dispatch, and workload visibility</div>
          </div>
        </div>

        <section className="analyticsInsightBand" aria-label="Analytics quick interpretation">
          <article className="analyticsInsightBandCard">
            <div className="analyticsInsightBandTitle">Operational procedure</div>
            <div className="analyticsInsightBandText">
              Start with coverage gaps, then validate EVV delays, and route unresolved backlog into dispatch follow-up before the review queue grows again.
            </div>

            <div className="analyticsInsightBandList">
              <div className="analyticsInsightBandItem">
                <span className="analyticsInsightBandItemLabel">Operational pressure</span>
                <span className="analyticsInsightBandItemMeta">Coverage, EVV, and review drag should be worked in that order.</span>
              </div>
              <div className="analyticsInsightBandItem">
                <span className="analyticsInsightBandItemLabel">Escalation rule</span>
                <span className="analyticsInsightBandItemMeta">Prioritize any region where backlog and dispatch lag move together.</span>
              </div>
            </div>
          </article>

          <article className="analyticsInsightBandCard">
            <div className="analyticsInsightBandTitle">Analytics interpretation</div>
            <div className="analyticsInsightBandText">
              Completion is holding up, but operational drag is still likely coming from late verification and slow work movement rather than pure demand volume.
            </div>

            <div className="analyticsInsightBandList">
              <div className="analyticsInsightBandItem">
                <span className="analyticsInsightBandItemLabel">What this means</span>
                <span className="analyticsInsightBandItemMeta">Workload balance and dispatch speed matter more than raw visit count right now.</span>
              </div>
              <div className="analyticsInsightBandItem">
                <span className="analyticsInsightBandItemLabel">Next action</span>
                <span className="analyticsInsightBandItemMeta">Use the surface below to compare trend movement against clinician load and queue pressure.</span>
              </div>
            </div>
          </article>
        </section>

        <AnalyticsDashboardPanel refreshKey={refreshKey} />
      </section>
    </AppPage>
  );
}
