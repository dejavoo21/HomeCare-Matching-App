import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type SummaryResponse = {
  totals: {
    queued: number;
    offered: number;
    accepted: number;
    enRoute: number;
    completed: number;
    cancelled: number;
    activeVisits: number;
  };
  performance: {
    acceptanceRate: number;
    avgDispatchSeconds: number;
    totalOffers: number;
    acceptedOffers: number;
  };
  professionalLoad: Array<{
    id: string;
    name: string;
    role: string;
    active_count: number;
  }>;
};

type TimeseriesRow = {
  day: string;
  created_count: number;
  completed_count: number;
  cancelled_count: number;
};

function formatSeconds(total: number) {
  const seconds = Number(total || 0);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function AnalyticsDashboardPanel({ refreshKey }: { refreshKey?: number }) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [series, setSeries] = useState<TimeseriesRow[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [summaryResp, seriesResp] = await Promise.all([
        (api.getAnalyticsSummary() as any) || {},
        (api.getAnalyticsTimeseries(days) as any) || {},
      ]);

      setSummary(summaryResp?.data || null);
      setSeries(seriesResp?.data || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setSummary(null);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [refreshKey, days]);

  const chartMax = useMemo(() => {
    const values = series.flatMap((row) => [
      Number(row.created_count || 0),
      Number(row.completed_count || 0),
      Number(row.cancelled_count || 0),
    ]);
    return Math.max(...values, 1);
  }, [series]);

  const hasSummaryData =
    Boolean(summary) &&
    (Object.values(summary?.totals || {}).some((value) => Number(value || 0) > 0) ||
      Object.values(summary?.performance || {}).some((value) => Number(value || 0) > 0) ||
      (summary?.professionalLoad || []).length > 0);

  return (
    <div className="analyticsCard" aria-label="Analytics dashboard">
      <div className="analyticsHeader analyticsHeader-compact">
        <div>
          <h3 className="analyticsTitle">Operational trend</h3>
          <p className="muted">Queue movement, dispatch performance, and workload visibility</p>
        </div>

        <select
          className="select analyticsRange"
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          aria-label="Analytics time range"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {loading ? (
        <div className="empty">Loading analytics...</div>
      ) : !summary || !hasSummaryData ? (
        <div className="premiumEmptyState">
          <div className="premiumEmptyTitle">No analytics yet</div>
          <div className="premiumEmptyText">
            Create requests, move work through dispatch, or complete visits to start building an
            operational performance story here.
          </div>
          <div className="premiumEmptyActions">
            <button className="btn btn-primary" onClick={() => setDays(7)}>
              Refresh last 7 days
            </button>
          </div>
        </div>
      ) : (
        <section className="analyticsWorkspaceGrid" aria-label="Analytics workspace">
          <div className="analyticsChartCard">
            <div className="analyticsCardTitle">Operational trend</div>
            <div className="analyticsCardSubtitle">
              Request throughput, queue movement, and operational pattern visibility over the
              selected period.
            </div>

            <div className="analyticsChartArea">
              <div className="analyticsStatsGrid">
                <div className="analyticsStat">
                  <div className="analyticsStatLabel">Queued</div>
                  <div className="analyticsStatValue">{summary.totals.queued}</div>
                </div>

                <div className="analyticsStat">
                  <div className="analyticsStatLabel">Active Visits</div>
                  <div className="analyticsStatValue">{summary.totals.activeVisits}</div>
                </div>

                <div className="analyticsStat">
                  <div className="analyticsStatLabel">Completed</div>
                  <div className="analyticsStatValue">{summary.totals.completed}</div>
                </div>

                <div className="analyticsStat">
                  <div className="analyticsStatLabel">Acceptance Rate</div>
                  <div className="analyticsStatValue">{summary.performance.acceptanceRate}%</div>
                </div>

                <div className="analyticsStat">
                  <div className="analyticsStatLabel">Avg Dispatch Time</div>
                  <div className="analyticsStatValue">
                    {formatSeconds(summary.performance.avgDispatchSeconds)}
                  </div>
                </div>

                <div className="analyticsStat">
                  <div className="analyticsStatLabel">Cancelled</div>
                  <div className="analyticsStatValue">{summary.totals.cancelled}</div>
                </div>
              </div>

              {series.length === 0 ? (
                <div className="premiumEmptyState premiumEmptyState-compact">
                  <div className="premiumEmptyTitle">No trend data for this range</div>
                  <div className="premiumEmptyText">
                    Expand the date range or generate more request activity to see dispatch
                    movement.
                  </div>
                </div>
              ) : (
                <div className="trendChart trendChart-tall">
                  {series.map((row) => {
                    const created = Number(row.created_count || 0);
                    const completed = Number(row.completed_count || 0);
                    const cancelled = Number(row.cancelled_count || 0);

                    return (
                      <div key={row.day} className="trendColumn">
                        <div className="trendBars trendBars-tall">
                          <div
                            className="trendBar trendBarCreated"
                            style={{ height: `${(created / chartMax) * 180}px` }}
                            title={`Created: ${created}`}
                          />
                          <div
                            className="trendBar trendBarCompleted"
                            style={{ height: `${(completed / chartMax) * 180}px` }}
                            title={`Completed: ${completed}`}
                          />
                          <div
                            className="trendBar trendBarCancelled"
                            style={{ height: `${(cancelled / chartMax) * 180}px` }}
                            title={`Cancelled: ${cancelled}`}
                          />
                        </div>
                        <div className="trendLabel">
                          {new Date(row.day).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="analyticsStack">
            <div className="analyticsWorkloadCard">
              <div className="analyticsCardTitle">Professional workload</div>
              <div className="analyticsCardSubtitle">
                Current workload distribution across active clinicians.
              </div>

              {summary.professionalLoad.length === 0 ? (
                <div className="premiumEmptyState premiumEmptyState-compact">
                  <div className="premiumEmptyTitle">No workload distribution yet</div>
                  <div className="premiumEmptyText">
                    Assign work to clinicians to unlock active workload balance visibility.
                  </div>
                </div>
              ) : (
                <div className="analyticsMiniList">
                  {summary.professionalLoad.map((pro) => (
                    <div key={pro.id} className="analyticsMiniRow">
                      <div>
                        <div className="analyticsMiniRowLabel">{pro.name}</div>
                        <div className="analyticsMiniRowMeta">{String(pro.role).toUpperCase()}</div>
                      </div>
                      <div className="analyticsMiniRowValue">{pro.active_count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="analyticsExceptionCard">
              <div className="analyticsCardTitle">Operational pressure</div>
              <div className="analyticsCardSubtitle">
                Exception indicators affecting service delivery.
              </div>

              <div className="analyticsMiniList">
                <div className="analyticsMiniRow">
                  <div>
                    <div className="analyticsMiniRowLabel">Coverage gaps</div>
                    <div className="analyticsMiniRowMeta">Total unresolved over period</div>
                  </div>
                  <div className="analyticsMiniRowValue">{summary.totals.queued}</div>
                </div>

                <div className="analyticsMiniRow">
                  <div>
                    <div className="analyticsMiniRowLabel">Late EVV events</div>
                    <div className="analyticsMiniRowMeta">Potential verification exceptions</div>
                  </div>
                  <div className="analyticsMiniRowValue">{summary.totals.cancelled}</div>
                </div>

                <div className="analyticsMiniRow">
                  <div>
                    <div className="analyticsMiniRowLabel">Dispatch lag</div>
                    <div className="analyticsMiniRowMeta">Average time to move work</div>
                  </div>
                  <div className="analyticsMiniRowValue analyticsMiniRowValue-wide">
                    {formatSeconds(summary.performance.avgDispatchSeconds)}
                  </div>
                </div>
              </div>
            </div>

            <div className="analyticsInterpretationCard">
              <div className="analyticsCardTitle">Analytics interpretation</div>
              <div className="analyticsCardSubtitle">
                Executive summary for operational leaders.
              </div>

              <div className="analyticsNarrativePoints">
                <div className="analyticsNarrativePoint">
                  Completion performance is strong and trending positively.
                </div>
                <div className="analyticsNarrativePoint">
                  EVV and review-related exceptions still create operational drag.
                </div>
                <div className="analyticsNarrativePoint">
                  Regional and workload analytics should guide staffing, dispatch, and follow-up
                  decisions.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
