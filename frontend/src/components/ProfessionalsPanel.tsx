import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

type Professional = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
  location?: string;
  isActive?: boolean;
  is_active?: boolean;
};

type ProfessionalsPanelProps = {
  refreshKey?: number;
  summaryOnly?: boolean;
};

function getDisplayName(item: Professional) {
  if (item.name) return item.name;
  return `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unknown Professional';
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U'
  );
}

function normalizeRole(role?: string) {
  const value = String(role || '').toLowerCase();
  if (value.includes('doctor')) return 'doctor';
  if (value.includes('nurse')) return 'nurse';
  return 'nurse';
}

export function ProfessionalsPanel({
  refreshKey,
  summaryOnly = false,
}: ProfessionalsPanelProps) {
  const [items, setItems] = useState<Professional[]>([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<'all' | 'nurse' | 'doctor'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const response = (await api.getAllProfessionals()) as any;
        if (!mounted) return;

        const normalized = (response?.data || []).map((item: any) => ({
          ...item,
          isActive: item.isActive ?? item.is_active ?? true,
        }));

        setItems(normalized);
      } catch (error) {
        console.error('Failed to load professionals:', error);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const activeItems = useMemo(
    () => items.filter((item) => (item.isActive ?? item.is_active ?? true) === true),
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return activeItems
      .filter((item) => ['nurse', 'doctor'].includes(normalizeRole(item.role)))
      .filter((item) => (role === 'all' ? true : normalizeRole(item.role) === role))
      .filter((item) => {
        if (!q) return true;
        const hay = [
          getDisplayName(item),
          item.email,
          item.location,
          item.role,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
  }, [activeItems, query, role]);

  const doctors = activeItems.filter((item) => normalizeRole(item.role) === 'doctor');
  const nurses = activeItems.filter((item) => normalizeRole(item.role) === 'nurse');
  const preview = filtered.slice(0, 3);

  if (summaryOnly) {
    return (
      <section className="workforcePanel" aria-label="Team availability">
        <div className="workforcePanelInner">
          <div className="workforcePanelHeader">
            <div>
              <div className="workforcePanelEyebrow">Workforce readiness</div>
              <h3 className="workforcePanelTitle">Team Availability</h3>
              <p className="workforcePanelSubtitle">Who is available to absorb live demand right now</p>
            </div>

            <div className="workforcePanelPills">
              <span className="workforcePill">Nurses {nurses.length}</span>
              <span className="workforcePill">Doctors {doctors.length}</span>
            </div>
          </div>

          <div className="workforceDivider" />

          <div className="workforceMetrics">
            <div className="workforceMetricCard">
              <div className="workforceMetricLabel">Ready now</div>
              <div className="workforceMetricValue">{activeItems.length}</div>
            </div>

            <div className="workforceMetricCard">
              <div className="workforceMetricLabel">Nurses</div>
              <div className="workforceMetricValue">{nurses.length}</div>
            </div>

            <div className="workforceMetricCard">
              <div className="workforceMetricLabel">Doctors</div>
              <div className="workforceMetricValue">{doctors.length}</div>
            </div>
          </div>

          <div className="workforceRosterCard">
            <div className="workforceRosterEyebrow">Available roster preview</div>

            {preview.length === 0 ? (
              <div className="railEmptyState">
                <div className="railEmptyText">No professionals available yet.</div>
              </div>
            ) : (
              <div className="workforceRosterList">
                {preview.map((item) => {
                  const name = getDisplayName(item);
                  const normalizedRole = normalizeRole(item.role);

                  return (
                    <div key={item.id} className="workforceRosterItem">
                      <div className="workforceRosterLeft">
                        <div className="workforceAvatar">{getInitials(name)}</div>
                        <div>
                          <div className="workforceName">{name}</div>
                          <div className="workforceMeta">{normalizedRole.toUpperCase()}</div>
                        </div>
                      </div>

                      <div
                        className={`workforceRoleBadge ${
                          normalizedRole === 'doctor'
                            ? 'workforceRoleBadge-doctor'
                            : 'workforceRoleBadge-nurse'
                        }`}
                      >
                        {normalizedRole}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link to="/admin/team" className="workforceFooterLink">
            Review workforce directory <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="sideCard">
      <div className="sideHeader">
        <div>
          <h3 className="sideTitle">Team Availability</h3>
          <p className="muted">Active doctors & nurses</p>
        </div>

        <div className="pillRow">
          <span className="pillSoft">
            Nurses <b>{nurses.length}</b>
          </span>
          <span className="pillSoft">
            Doctors <b>{doctors.length}</b>
          </span>
        </div>
      </div>

      <div className="rowGap">
        <input
          className="input"
          placeholder="Search team..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="chips">
          <button className={role === 'all' ? 'chip chip-active' : 'chip'} onClick={() => setRole('all')}>
            All
          </button>
          <button className={role === 'nurse' ? 'chip chip-active' : 'chip'} onClick={() => setRole('nurse')}>
            Nurses
          </button>
          <button className={role === 'doctor' ? 'chip chip-active' : 'chip'} onClick={() => setRole('doctor')}>
            Doctors
          </button>
        </div>

        {loading ? (
          <div className="skeletonList">
            <div className="skRow" />
            <div className="skRow" />
            <div className="skRow" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="emptyState">
            <div className="emptyTitle">No active professionals</div>
            <p className="muted">Check roles, active status, or admin permissions.</p>
          </div>
        ) : (
          <div className="proList">
            {filtered.map((item) => {
              const name = getDisplayName(item);
              const normalizedRole = normalizeRole(item.role);

              return (
                <div key={item.id} className="proRow">
                  <div className="proAvatar">{getInitials(name)}</div>

                  <div className="proMeta">
                    <div className="proName">{name}</div>
                    <div className="muted proSub">{item.email}</div>
                  </div>

                  <span
                    className={
                      normalizedRole === 'doctor' ? 'roleBadge roleDoctor' : 'roleBadge roleNurse'
                    }
                  >
                    {normalizedRole.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > 8 && <div className="muted tiny">Showing 8 of {filtered.length}</div>}
      </div>
    </div>
  );
}
