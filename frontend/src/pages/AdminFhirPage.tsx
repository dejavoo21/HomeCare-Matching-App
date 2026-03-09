import AppPage from '../components/layout/AppPage';
import ContentGrid from '../components/layout/ContentGrid';
import AssistantPanel from '../components/assistant/AssistantPanel';
import PageHero from '../components/ui/PageHero';
import SectionCard from '../components/ui/SectionCard';
import { FhirIntegrationPanel } from '../components/FhirIntegrationPanel';

export function AdminFhirPage() {
  return (
    <AppPage>
      <PageHero
        eyebrow="Healthcare interoperability"
        title="FHIR capability posture"
        description="Present supported resources, implementation posture, and interoperability readiness for healthcare-aligned integrations."
        stats={[
          { label: 'Supported resources', value: 2, subtitle: 'Enabled now' },
          { label: 'Planned resources', value: 3, subtitle: 'On roadmap' },
          { label: 'Access model', value: 'Controlled', subtitle: 'Permission-aware exchange' },
          { label: 'Readiness', value: 'Enterprise', subtitle: 'Standards-aligned direction' },
        ]}
      />

      <ContentGrid
        main={
          <SectionCard title="FHIR resources" subtitle="Current and planned interoperability surface">
            <FhirIntegrationPanel />
          </SectionCard>
        }
        rail={
          <>
            <SectionCard title="Interoperability notes" subtitle="Standards and governance framing">
              <div className="space-y-3">
                <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  FHIR capability should align with controlled, permission-aware data access rather than broad exposure.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Patient and practitioner resources provide a sensible starting point for enterprise interoperability.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Additional clinical resources should be introduced with strong audit and access controls.
                </div>
              </div>
            </SectionCard>

            <AssistantPanel context="dashboard" contextData={{ area: 'fhir' }} />
          </>
        }
      />
    </AppPage>
  );
}
