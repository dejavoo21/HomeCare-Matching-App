import { useEffect, useMemo, useState } from 'react';
import { ChatDrawer } from '../components/ChatDrawer';
import { WorkforceCard, type WorkforcePerson } from '../components/WorkforceCard';
import { WorkforceProfileDrawer } from '../components/WorkforceProfileDrawer';
import AppPage from '../components/layout/AppPage';
import ContentGrid from '../components/layout/ContentGrid';
import Button from '../components/ui/Button';
import AdminFilterBar from '../components/ui/AdminFilterBar';
import AdminPageHeader from '../components/ui/AdminPageHeader';
import AdminStatStrip from '../components/ui/AdminStatStrip';
import SectionCard from '../components/ui/SectionCard';
import EmptyState from '../components/ui/states/EmptyState';
import LoadingState from '../components/ui/states/LoadingState';
import { useRealTime } from '../contexts/RealTimeContext';
import { api } from '../services/api';

type FilterType = 'all' | 'nurse' | 'doctor';

function matchesQuery(person: WorkforcePerson, query: string) {
  if (!query) return true;

  return [person.name, person.role, person.region, person.phone, person.email, person.customStatus]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

export function AdminTeamPage() {
  const [items, setItems] = useState<WorkforcePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selected, setSelected] = useState<WorkforcePerson | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipientUserId, setChatRecipientUserId] = useState<string | null>(null);
  const { on } = useRealTime();

  const load = async () => {
    try {
      setLoading(true);
      const resp = (await api.getWorkforceDirectory()) as any;
      setItems(Array.isArray(resp?.data) ? resp.data : []);
    } catch (err) {
      console.error('Failed to load workforce directory:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return on('PRESENCE_UPDATED', (event) => {
      const payload = event?.data || {};
      const userId = payload.userId || event?.professionalId;
      if (!userId) return;

      setItems((current) =>
        current.map((person) =>
          person.id === userId
            ? {
                ...person,
                presenceStatus: payload.presenceStatus || person.presenceStatus,
                customStatus: payload.customStatus ?? person.customStatus,
                lastSeenAt: payload.lastSeenAt || person.lastSeenAt,
                region: payload.region || person.region,
              }
            : person
        )
      );

      setSelected((current) =>
        current && current.id === userId
          ? {
              ...current,
              presenceStatus: payload.presenceStatus || current.presenceStatus,
              customStatus: payload.customStatus ?? current.customStatus,
              lastSeenAt: payload.lastSeenAt || current.lastSeenAt,
              region: payload.region || current.region,
            }
          : current
      );
    });
  }, [on]);

  const counts = useMemo(() => {
    const people = items || [];
    return {
      total: people.length,
      active: people.filter((person) =>
        ['online', 'on_shift', 'in_visit', 'busy'].includes(
          String(person.presenceStatus || '').toLowerCase()
        )
      ).length,
      availableNow: people.filter((person) =>
        ['online', 'on_shift'].includes(String(person.presenceStatus || '').toLowerCase())
      ).length,
      nurses: people.filter((person) => String(person.role).toLowerCase() === 'nurse').length,
      doctors: people.filter((person) => String(person.role).toLowerCase() === 'doctor').length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return (items || [])
      .filter((person) => (filter === 'all' ? true : String(person.role).toLowerCase() === filter))
      .filter((person) => matchesQuery(person, query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, q, filter]);

  return (
    <AppPage className="adminPageSection">
      <AdminPageHeader
        eyebrow="Workforce directory"
        title="Team"
        description="A live directory for staffing, compliance, availability, workload, and work-linked communication."
        actions={
          <Button variant="primary" type="button" onClick={load}>
            Refresh Directory
          </Button>
        }
      >
        <AdminStatStrip
          items={[
            { label: 'Total workforce', value: counts.total, meta: 'Active directory members' },
            { label: 'Available now', value: counts.availableNow, meta: 'Ready for work allocation' },
            { label: 'Active now', value: counts.active, meta: 'Online, in visit, or busy' },
            { label: 'Clinical mix', value: `${counts.nurses}/${counts.doctors}`, meta: 'Nurses to doctors' },
          ]}
        />
      </AdminPageHeader>

      <ContentGrid
        main={
          <>
            <SectionCard
              title="Workforce directory"
              subtitle="Search and filter the live workforce layer"
            >
              <AdminFilterBar className="teamFilterBar">
                <input
                  className="input teamSearchInput"
                  placeholder="Search workforce by name, role, region, phone, or email..."
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  aria-label="Search workforce directory"
                />

                <div className="teamFilters" role="group" aria-label="Team role filters">
                  <button
                    className={filter === 'all' ? 'filterPill filterPill-active' : 'filterPill'}
                    type="button"
                    onClick={() => setFilter('all')}
                  >
                    All
                  </button>
                  <button
                    className={filter === 'nurse' ? 'filterPill filterPill-active' : 'filterPill'}
                    type="button"
                    onClick={() => setFilter('nurse')}
                  >
                    Nurses
                  </button>
                  <button
                    className={filter === 'doctor' ? 'filterPill filterPill-active' : 'filterPill'}
                    type="button"
                    onClick={() => setFilter('doctor')}
                  >
                    Doctors
                  </button>
                </div>
              </AdminFilterBar>

              {loading ? (
                <LoadingState rows={6} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  title="No team members match these filters"
                  description="Broaden the search or role filter to see more clinicians in the directory."
                  actionLabel="Reset Filters"
                  onAction={() => {
                    setQ('');
                    setFilter('all');
                  }}
                />
              ) : (
                <div className="workforceGrid">
                  {filtered.map((person) => (
                    <WorkforceCard
                      key={person.id}
                      person={person}
                      onViewProfile={() => setSelected(person)}
                      onMessage={() => {
                        setChatRecipientUserId(person.id);
                        setChatOpen(true);
                      }}
                      onCall={() => setSelected(person)}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        }
        rail={
          <>
            <SectionCard title="Workforce posture" subtitle="Live workforce signal for allocation and coordination">
              <div className="space-y-3">
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Workforce readiness is stable across active regions.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Use the directory to balance workload and identify available clinicians.
                </div>
              </div>
            </SectionCard>
          </>
        }
      />

      <WorkforceProfileDrawer person={selected} onClose={() => setSelected(null)} />
      <ChatDrawer
        open={chatOpen}
        initialRecipientUserId={chatRecipientUserId}
        onClose={() => {
          setChatOpen(false);
          setChatRecipientUserId(null);
        }}
      />
    </AppPage>
  );
}
