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
  const s = Number(total || 0);
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}m ${sec}s`;
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
    load();
  }, [refreshKey, days]);

  const chartMax = useMemo(() => {
    const values = series.flatMap((r) => [
      Number(r.created_count || 0),
      Number(r.completed_count || 0),
      Number(r.cancelled_count || 0),
    ]);
    return Math.max(...values, 1);
  }, [series]);

  return (
    <div className="analyticsCard" aria-label="Analytics dashboard">
      <div className="analyticsHeader">
        <div>
          <h3 className="analyticsTitle">Operations Analytics</h3>
          <p className="muted">Queue health, dispatch performance, and workload visibility</p>
        </div>

        <select
          className="select analyticsRange"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Analytics time range"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {loading ? (
        <div className="empty">Loading analytics…</div>
      ) : !summary ? (
        <div className="empty">No analytics available.</div>
      ) : (
        <>
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
              <div className="analyticsStatValue">{formatSeconds(summary.performance.avgDispatchSeconds)}</div>
            </div>

            <div className="analyticsStat">
              <div className="analyticsStatLabel">Cancelled</div>
              <div className="analyticsStatValue">{summary.totals.cancelled}</div>
            </div>
          </div>

          <div className="analyticsSection">
            <div className="analyticsSectionTitle">Request Trend</div>

            {series.length === 0 ? (
              <div className="empty">No trend data found.</div>
            ) : (
              <div className="trendChart">
                {series.map((row) => {
                  const created = Number(row.created_count || 0);
                  const completed = Number(row.completed_count || 0);
                  const cancelled = Number(row.cancelled_count || 0);

                  return (
                    <div key={row.day} className="trendColumn">
                      <div className="trendBars">
                        <div
                          className="trendBar trendBarCreated"
                          style={{ height: `${(created / chartMax) * 120}px` }}
                          title={`Created: ${created}`}
                        />
                        <div
                          className="trendBar trendBarCompleted"
                          style={{ height: `${(completed / chartMax) * 120}px` }}
                          title={`Completed: ${completed}`}
                        />
                        <div
                          className="trendBar trendBarCancelled"
                          style={{ height: `${(cancelled / chartMax) * 120}px` }}
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

          <div className="analyticsSection">
            <div className="analyticsSectionTitle">Professional Workload</div>

            {summary.professionalLoad.length === 0 ? (
              <div className="empty">No professional workload data found.</div>
            ) : (
              <div className="workloadList">
                {summary.professionalLoad.map((pro) => (
                  <div key={pro.id} className="workloadItem">
                    <div className="workloadIdentity">
                      <div className="workloadName">{pro.name}</div>
                      <div className="muted">{String(pro.role).toUpperCase()}</div>
                    </div>

                    <div className="workloadCount">
                      <span className="workloadBadge">{pro.active_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
