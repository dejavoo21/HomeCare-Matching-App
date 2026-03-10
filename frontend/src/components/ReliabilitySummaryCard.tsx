import { Link } from 'react-router-dom';

export function ReliabilitySummaryCard() {
  return (
    <div className="summaryCard summaryCard-emerald">
      <div>
        <div className="summaryCardEyebrow">Operations</div>
        <h3 className="summaryCardTitle">Reliability</h3>
        <p className="summaryCardBody">
          Inspect webhook delivery health, retries, failures, and operational reliability signals.
        </p>
      </div>

      <Link to="/admin/integrations/reliability" className="summaryCardAction">
        Open Reliability <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
