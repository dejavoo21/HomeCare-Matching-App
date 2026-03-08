import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function FhirIntegrationPanel() {
  const [metadata, setMetadata] = useState<any>(null);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);

      const [metaResp, srResp] = await Promise.all([
        api.getFhirMetadata() as any,
        api.searchFhirServiceRequests() as any,
      ]);

      setMetadata(metaResp || null);

      const bundle = srResp?.data || srResp;
      const entries = Array.isArray(bundle?.entry) ? bundle.entry : [];
      setServiceRequests(entries);
    } catch (err) {
      console.error('FHIR panel load error:', err);
      setMetadata(null);
      setServiceRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fhirVersion = metadata?.data?.fhirVersion || metadata?.fhirVersion || '4.0.1';

  return (
    <div className="cardShell">
      <div className="cardHeader">
        <div>
          <h3 className="cardTitle">FHIR Integration Starter</h3>
          <p className="cardSub">FHIR-aligned resources exposed from the platform</p>
        </div>
      </div>

      <div className="cardBody">
        {loading ? (
          <div className="empty">Loading FHIR resources...</div>
        ) : (
          <div className="rowGap">
            <div className="fhirSummary">
              <div className="fhirChip">
                Version <b>{fhirVersion}</b>
              </div>
              <div className="fhirChip">
                Resources <b>Patient / Practitioner / ServiceRequest / Task</b>
              </div>
            </div>

            <div>
              <div className="sectionTitle">Recent ServiceRequests</div>

              {serviceRequests.length === 0 ? (
                <div className="empty">No ServiceRequest resources found.</div>
              ) : (
                <div className="fhirList">
                  {serviceRequests.slice(0, 8).map((entry: any, idx: number) => {
                    const resource = entry.resource || entry;
                    return (
                      <div key={resource.id || idx} className="fhirItem">
                        <div className="fhirItemTitle">
                          {resource.code?.text || 'ServiceRequest'}
                        </div>
                        <div className="muted">
                          {resource.status} | {resource.priority}
                        </div>
                        <div className="mono small">{resource.id}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
