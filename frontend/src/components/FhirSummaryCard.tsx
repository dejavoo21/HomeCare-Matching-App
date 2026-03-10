import { Link } from 'react-router-dom';

export function FhirSummaryCard() {
  return (
    <div className="summaryCard summaryCard-indigo">
      <div>
        <div className="summaryCardEyebrow">Interoperability</div>
        <h3 className="summaryCardTitle">FHIR API</h3>
        <p className="summaryCardBody">
          Review exposed FHIR-aligned resources, metadata, and interoperability coverage.
        </p>
      </div>

      <Link to="/admin/integrations/fhir" className="summaryCardAction">
        Open FHIR API <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
