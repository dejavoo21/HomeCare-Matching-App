import { Link } from 'react-router-dom';

export function ReliabilitySummaryCard() {
  return (
    <div className="summaryLinkCard">
      <div className="summaryLinkCardTop">
        <div>
          <div className="summaryLinkEyebrow">Operations</div>
          <h3 className="summaryLinkTitle">Reliability</h3>
        </div>
      </div>

      <p className="summaryLinkText">
        Inspect webhook delivery health, retries, failures, and operational reliability signals.
      </p>

      <Link to="/admin/integrations/reliability" className="summaryLinkAction">
        Open Reliability -&gt;
      </Link>
    </div>
  );
}
