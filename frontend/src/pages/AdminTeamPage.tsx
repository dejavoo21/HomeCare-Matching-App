import { useEffect, useMemo, useState } from 'react';
import { ChatDrawer } from '../components/ChatDrawer';
import { WorkforceCard, type WorkforcePerson } from '../components/WorkforceCard';
import { WorkforceProfileDrawer } from '../components/WorkforceProfileDrawer';
import { useRealTime } from '../contexts/RealTimeContext';
import { api } from '../services/api';

type FilterType = 'all' | 'nurse' | 'doctor';

function matchesQuery(person: WorkforcePerson, query: string) {
  if (!query) return true;

  return [
    person.name,
    person.role,
    person.region,
    person.phone,
    person.email,
    person.customStatus,
  ]
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
        ['online', 'on_shift', 'in_visit', 'busy'].includes(String(person.presenceStatus || '').toLowerCase())
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
    <main className="pageStack" role="main" aria-label="Workforce directory">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Workforce Directory</h1>
            <p className="subtitle">
              Live staffing visibility, workforce presence, and role-based contact access for care operations.
            </p>
          </div>

          <div className="pageActions">
            <button className="btn btn-primary" type="button" onClick={load}>
              Refresh Directory
            </button>
          </div>
        </div>
      </section>

      <section className="teamSummaryGrid">
        <div className="teamSummaryCard">
          <div className="teamSummaryLabel">Total Professionals</div>
          <div className="teamSummaryValue">{counts.total}</div>
        </div>

        <div className="teamSummaryCard">
          <div className="teamSummaryLabel">Available Right Now</div>
          <div className="teamSummaryValue">{counts.availableNow}</div>
        </div>

        <div className="teamSummaryCard">
          <div className="teamSummaryLabel">Nurses</div>
          <div className="teamSummaryValue">{counts.nurses}</div>
        </div>

        <div className="teamSummaryCard">
          <div className="teamSummaryLabel">Doctors</div>
          <div className="teamSummaryValue">{counts.doctors}</div>
        </div>
      </section>

      <section className="pageCard workforceDirectoryCard">
        <div className="teamToolbar">
          <input
            className="input"
            placeholder="Search workforce by name, role, region, phone, or email..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
            aria-label="Search workforce directory"
          />

          <div className="teamFilters">
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
        </div>

        {loading ? (
          <div className="premiumEmptyState">
            <div className="premiumEmptyTitle">Loading workforce directory</div>
            <div className="premiumEmptyText">
              Pulling presence, workload, and staff availability for operations visibility.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="premiumEmptyState">
            <div className="premiumEmptyTitle">No team members match these filters</div>
            <div className="premiumEmptyText">
              Broaden the search or role filter to see more clinicians in the directory.
            </div>
          </div>
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
      </section>

      <WorkforceProfileDrawer person={selected} onClose={() => setSelected(null)} />
      <ChatDrawer
        open={chatOpen}
        initialRecipientUserId={chatRecipientUserId}
        onClose={() => {
          setChatOpen(false);
          setChatRecipientUserId(null);
        }}
      />
    </main>
  );
}
