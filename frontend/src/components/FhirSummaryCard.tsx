import { Link } from 'react-router-dom';

export function FhirSummaryCard() {
  return (
    <div className="summaryLinkCard">
      <div className="summaryLinkCardTop">
        <div>
          <div className="summaryLinkEyebrow">Interoperability</div>
          <h3 className="summaryLinkTitle">FHIR API</h3>
        </div>
      </div>

      <p className="summaryLinkText">
        Review exposed FHIR-aligned resources, metadata, and interoperability coverage.
      </p>

      <Link to="/admin/integrations/fhir" className="summaryLinkAction">
        Open FHIR API -&gt;
      </Link>
    </div>
  );
}
