import { Link } from 'react-router-dom';

export function AnalyticsSummaryCard() {
  return (
    <div className="summaryLinkCard">
      <div className="summaryLinkCardTop">
        <div>
          <div className="summaryLinkEyebrow">Performance</div>
          <h3 className="summaryLinkTitle">Analytics</h3>
        </div>
      </div>

      <p className="summaryLinkText">
        Explore dispatch trends, acceptance rates, workload distribution, and completion patterns.
      </p>

      <Link to="/admin/analytics" className="summaryLinkAction">
        Open Analytics →
      </Link>
    </div>
  );
}
