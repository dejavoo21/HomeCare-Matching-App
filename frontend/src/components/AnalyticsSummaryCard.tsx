import { Link } from 'react-router-dom';

export function AnalyticsSummaryCard() {
  return (
    <div className="summaryCard summaryCard-blue">
      <div>
        <div className="summaryCardEyebrow">Performance</div>
        <h3 className="summaryCardTitle">Analytics</h3>
        <p className="summaryCardBody">
          Explore dispatch trends, acceptance rates, workload distribution, and completion patterns.
        </p>
      </div>

      <Link to="/admin/analytics" className="summaryCardAction">
        Open Analytics <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
