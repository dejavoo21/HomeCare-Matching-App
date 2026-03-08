import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type Pro = {
  id: string;
  name: string;
  email: string;
  role: 'nurse' | 'doctor' | string;
  isActive?: boolean;
  is_active?: boolean;
  location?: string;
};

type FilterType = 'all' | 'nurse' | 'doctor';

function initials(name: string) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function AdminTeamPage() {
  const [items, setItems] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const load = async () => {
    try {
      setLoading(true);
      const resp = (await api.getProfessionals()) as any;
      const normalized = (resp?.data || []).map((professional: Pro) => ({
        ...professional,
        isActive: professional.isActive ?? professional.is_active ?? true,
      }));
      setItems(normalized);
    } catch (err) {
      console.error('Failed to load team:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const pros = items || [];
    return {
      total: pros.length,
      active: pros.filter((professional) => professional.isActive !== false).length,
      nurses: pros.filter((professional) => String(professional.role).toLowerCase() === 'nurse').length,
      doctors: pros.filter((professional) => String(professional.role).toLowerCase() === 'doctor').length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return (items || [])
      .filter((professional) => professional.isActive !== false)
      .filter((professional) => {
        if (filter === 'all') {
          return true;
        }
        return String(professional.role).toLowerCase() === filter;
      })
      .filter((professional) => {
        if (!query) {
          return true;
        }

        return [professional.name, professional.email, professional.location, professional.role]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, q, filter]);

  return (
    <main className="pageStack" role="main" aria-label="Team page">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Team</h1>
            <p className="subtitle">
              View doctors, nurses, roster coverage, and active professional availability.
            </p>
          </div>

          <div className="pageActions">
            <button className="btn btn-primary" onClick={load}>
              Refresh Team
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
          <div className="teamSummaryLabel">Active Now</div>
          <div className="teamSummaryValue">{counts.active}</div>
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

      <section className="pageCard">
        <div className="teamToolbar">
          <input
            className="input"
            placeholder="Search team by name, email, or location..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
            aria-label="Search team"
          />

          <div className="teamFilters">
            <button
              className={filter === 'all' ? 'filterPill filterPill-active' : 'filterPill'}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={filter === 'nurse' ? 'filterPill filterPill-active' : 'filterPill'}
              onClick={() => setFilter('nurse')}
            >
              Nurses
            </button>
            <button
              className={filter === 'doctor' ? 'filterPill filterPill-active' : 'filterPill'}
              onClick={() => setFilter('doctor')}
            >
              Doctors
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty">Loading team members...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No team members match your filters.</div>
        ) : (
          <div className="teamGrid">
            {filtered.map((pro) => {
              const role = String(pro.role).toLowerCase();
              const roleClass =
                role === 'doctor'
                  ? 'teamRoleBadge teamRoleBadge-doctor'
                  : 'teamRoleBadge teamRoleBadge-nurse';

              return (
                <div key={pro.id} className="teamMemberCard">
                  <div className="teamMemberTop">
                    <div className="teamIdentity">
                      <div className="teamAvatar">{initials(pro.name)}</div>

                      <div>
                        <div className="teamName">{pro.name}</div>
                        <div className="teamMeta">
                          {pro.email}
                          {pro.location ? ` - ${pro.location}` : ''}
                        </div>
                      </div>
                    </div>

                    <span className={roleClass}>{role.toUpperCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
