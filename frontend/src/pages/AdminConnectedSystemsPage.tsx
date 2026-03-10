import { Link } from 'react-router-dom';
import AppPage from '../components/layout/AppPage';
import ContentGrid from '../components/layout/ContentGrid';
import PageHero from '../components/ui/PageHero';
import SectionCard from '../components/ui/SectionCard';
import AssistantPanel from '../components/assistant/AssistantPanel';
import { InsightCard } from '../components/InsightCard';

type SystemStatus = 'healthy' | 'degraded' | 'disconnected';
type SystemType = 'Hospital' | 'Partner' | 'Dispatch Agency' | 'FHIR Endpoint' | 'Webhook';

type ConnectedSystem = {
  id: string;
  name: string;
  type: SystemType;
  status: SystemStatus;
  region: string;
  lastSync: string;
  endpointCount: number;
  owner: string;
  notes: string;
};

const systems: ConnectedSystem[] = [
  {
    id: 'sys_1',
    name: 'Boston General Hospital',
    type: 'Hospital',
    status: 'healthy',
    region: 'Boston MA',
    lastSync: '2 min ago',
    endpointCount: 6,
    owner: 'Integration Admin',
    notes: 'ADT, referral intake, and discharge event flow healthy.',
  },
  {
    id: 'sys_2',
    name: 'Northshore Dispatch Partner',
    type: 'Dispatch Agency',
    status: 'degraded',
    region: 'Boston MA',
    lastSync: '18 min ago',
    endpointCount: 3,
    owner: 'Ops Integrations',
    notes: 'Offer callback retries observed on one webhook channel.',
  },
  {
    id: 'sys_3',
    name: 'Regional FHIR Gateway',
    type: 'FHIR Endpoint',
    status: 'healthy',
    region: 'Multi-region',
    lastSync: '5 min ago',
    endpointCount: 8,
    owner: 'FHIR Admin',
    notes: 'Patient, Appointment, and Encounter resources responding normally.',
  },
  {
    id: 'sys_4',
    name: 'Onboarding Document Verifier',
    type: 'Partner',
    status: 'disconnected',
    region: 'Global',
    lastSync: '2 hrs ago',
    endpointCount: 2,
    owner: 'Security Admin',
    notes: 'Credential evidence verification callback unavailable.',
  },
  {
    id: 'sys_5',
    name: 'Visit Status Webhook Bus',
    type: 'Webhook',
    status: 'healthy',
    region: 'Multi-region',
    lastSync: '1 min ago',
    endpointCount: 5,
    owner: 'Platform Reliability',
    notes: 'Realtime delivery healthy with no active retry backlog.',
  },
  {
    id: 'sys_6',
    name: 'Care Referral Network',
    type: 'Partner',
    status: 'degraded',
    region: 'London',
    lastSync: '26 min ago',
    endpointCount: 4,
    owner: 'Partnership Ops',
    notes: 'Inbound referrals delayed due to intermittent payload validation errors.',
  },
];

function statusClass(status: SystemStatus) {
  if (status === 'healthy') return 'integrationStatus integrationStatus-healthy';
  if (status === 'degraded') return 'integrationStatus integrationStatus-degraded';
  return 'integrationStatus integrationStatus-disconnected';
}

function typeClass(type: SystemType) {
  const normalized = type.toLowerCase().replace(/\s+/g, '-');
  return `integrationType integrationType-${normalized}`;
}

function ConnectedSystemCard({ item }: { item: ConnectedSystem }) {
  return (
    <div className="integrationCard">
      <div className="integrationCardTop">
        <div>
          <div className="integrationCardTitle">{item.name}</div>
          <div className="integrationCardMeta">
            <span className={typeClass(item.type)}>{item.type}</span>
            <span>{item.region}</span>
          </div>
        </div>

        <div className={statusClass(item.status)}>{item.status}</div>
      </div>

      <div className="integrationCardBody">{item.notes}</div>

      <div className="integrationMiniGrid">
        <div className="integrationMiniStat">
          <div className="integrationMiniLabel">Last sync</div>
          <div className="integrationMiniValue">{item.lastSync}</div>
        </div>
        <div className="integrationMiniStat">
          <div className="integrationMiniLabel">Endpoints</div>
          <div className="integrationMiniValue">{item.endpointCount}</div>
        </div>
        <div className="integrationMiniStat">
          <div className="integrationMiniLabel">Owner</div>
          <div className="integrationMiniValue">{item.owner}</div>
        </div>
      </div>

      <div className="integrationActionRow">
        <Link to="/admin/integrations/reliability" className="btn">
          Reliability
        </Link>
        <Link to="/admin/audit" className="btn">
          Audit
        </Link>
      </div>
    </div>
  );
}

export function AdminConnectedSystemsPage() {
  const healthy = systems.filter((system) => system.status === 'healthy').length;
  const degraded = systems.filter((system) => system.status === 'degraded').length;
  const disconnected = systems.filter((system) => system.status === 'disconnected').length;
  const totalEndpoints = systems.reduce((sum, system) => sum + system.endpointCount, 0);

  return (
    <AppPage>
      <PageHero
        eyebrow="Enterprise integration surface"
        title="Connected Systems"
        description="Monitor partner connections, hospital endpoints, dispatch agency links, webhook reliability, and interoperability posture from one integration command surface."
        stats={[
          { label: 'Connected systems', value: systems.length, subtitle: 'Tracked external integrations' },
          { label: 'Healthy', value: healthy, subtitle: 'Operating normally' },
          { label: 'Degraded', value: degraded, subtitle: 'Needs review' },
          { label: 'Disconnected', value: disconnected, subtitle: 'Requires intervention' },
        ]}
        rightContent={
          <div className="space-y-3">
            <Link to="/admin/integrations/reliability" className="btn btn-primary">
              Open Reliability
            </Link>
            <Link to="/admin/integrations/fhir" className="btn">
              Open FHIR API
            </Link>
          </div>
        }
      />

      <section className="insightGrid" aria-label="Integration health summary">
        <InsightCard
          label="Healthy connections"
          value={healthy}
          helper="Systems with normal sync and delivery posture"
          trendLabel="Stable"
          tone="green"
          points={[4, 4, 5, 5, 5, 4, 4]}
        />
        <InsightCard
          label="Degraded systems"
          value={degraded}
          helper="Connections showing retry, delay, or validation issues"
          trendLabel="Monitor"
          tone="amber"
          points={[1, 1, 1, 2, 2, 2, 2]}
        />
        <InsightCard
          label="Disconnected"
          value={disconnected}
          helper="Integrations needing active recovery"
          trendLabel="Action needed"
          tone="rose"
          points={[0, 0, 0, 1, 1, 1, 1]}
        />
        <InsightCard
          label="Endpoints tracked"
          value={totalEndpoints}
          helper="Hospital, partner, FHIR, and webhook endpoints"
          trendLabel="Coverage"
          tone="blue"
          points={[18, 20, 22, 22, 24, 26, 28]}
        />
      </section>

      <ContentGrid
        main={
          <>
            <SectionCard
              title="Integration directory"
              subtitle="Connected systems, ownership, sync posture, and endpoint coverage"
            >
              <div className="integrationGrid">
                {systems.map((item) => (
                  <ConnectedSystemCard key={item.id} item={item} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Integration pathways" subtitle="Primary navigation across connected operations">
              <div className="integrationPathGrid">
                <Link to="/admin/integrations/fhir" className="integrationPathCard integrationPathCard-indigo">
                  <div className="integrationPathEyebrow">Interoperability</div>
                  <div className="integrationPathTitle">FHIR API</div>
                  <div className="integrationPathText">
                    Review exposed resources, metadata coverage, and endpoint readiness.
                  </div>
                </Link>

                <Link to="/admin/integrations/reliability" className="integrationPathCard integrationPathCard-emerald">
                  <div className="integrationPathEyebrow">Operations</div>
                  <div className="integrationPathTitle">Reliability</div>
                  <div className="integrationPathText">
                    Inspect retries, failures, delivery backlog, and operational signals.
                  </div>
                </Link>

                <Link to="/admin/audit" className="integrationPathCard integrationPathCard-violet">
                  <div className="integrationPathEyebrow">Compliance</div>
                  <div className="integrationPathTitle">Audit Trail</div>
                  <div className="integrationPathText">
                    Review access, approval, and system activity tied to integrations.
                  </div>
                </Link>
              </div>
            </SectionCard>
          </>
        }
        rail={
          <>
            <SectionCard title="Integration priorities">
              <div className="space-y-3">
                <div className="integrationFocus integrationFocus-danger">
                  Recover disconnected document verification callback.
                </div>
                <div className="integrationFocus integrationFocus-warning">
                  Investigate degraded dispatch partner retries and referral validation failures.
                </div>
                <div className="integrationFocus integrationFocus-neutral">
                  Keep webhook and FHIR pathways under continuous reliability review.
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Recent sync posture">
              <div className="integrationSyncList">
                {systems.slice(0, 4).map((item) => (
                  <div key={item.id} className="integrationSyncRow">
                    <div>
                      <div className="integrationSyncTitle">{item.name}</div>
                      <div className="integrationSyncMeta">{item.lastSync}</div>
                    </div>
                    <div className={statusClass(item.status)}>{item.status}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <AssistantPanel
              context="dashboard"
              contextData={{ page: 'connected_systems', healthy, degraded, disconnected }}
            />
          </>
        }
      />
    </AppPage>
  );
}
