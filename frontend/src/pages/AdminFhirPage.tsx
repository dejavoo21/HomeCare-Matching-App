import { FhirIntegrationPanel } from '../components/FhirIntegrationPanel';
import '../index.css';

export function AdminFhirPage() {
  return (
    <div className="pageStack">
      <div className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">FHIR API</h1>
            <p className="subtitle">
              Review FHIR-aligned resources, metadata, and interoperability exposure for connected healthcare systems.
            </p>
          </div>
        </div>
      </div>
      <FhirIntegrationPanel />
    </div>
  );
}
