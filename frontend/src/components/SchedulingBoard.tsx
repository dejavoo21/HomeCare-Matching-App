import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type Professional = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Visit = {
  id: string;
  client_id: string;
  professional_id?: string | null;
  service_type: string;
  address_text?: string;
  preferred_start: string;
  urgency: string;
  status: string;
  description?: string;
  client_name?: string;
  professional_name?: string;
  professional_role?: string;
};

type BoardResponse = {
  range: {
    start: string;
    end: string;
    days: number;
  };
  professionals: Professional[];
  visits: Visit[];
};

function formatDay(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sameDay(a: string, b: Date) {
  const da = new Date(a);
  return (
    da.getFullYear() === b.getFullYear() &&
    da.getMonth() === b.getMonth() &&
    da.getDate() === b.getDate()
  );
}

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function SchedulingBoard() {
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'all' | 'nurse' | 'doctor'>('all');
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));

  const load = async () => {
    try {
      setLoading(true);
      const start = weekStart.toISOString().slice(0, 10);
      const response = (await api.getScheduleBoard(start, 7, role)) as any;
      setBoard(response?.data || null);
    } catch (err) {
      console.error('Failed to load scheduling board:', err);
      setBoard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [role, weekStart]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, [weekStart]);

  const previousWeek = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() - 7);
    setWeekStart(date);
  };

  const nextWeek = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + 7);
    setWeekStart(date);
  };

  const visitsByProfessional = useMemo(() => {
    const map = new Map<string, Visit[]>();
    (board?.visits || []).forEach((visit) => {
      const key = visit.professional_id || 'unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(visit);
    });
    return map;
  }, [board]);

  const professionals = useMemo(() => {
    const rows = [...(board?.professionals || [])];
    const hasUnassigned = (visitsByProfessional.get('unassigned') || []).length > 0;

    if (hasUnassigned) {
      rows.unshift({
        id: 'unassigned',
        name: 'Unassigned Queue',
        email: '',
        role: 'queue',
      });
    }

    return rows;
  }, [board, visitsByProfessional]);

  return (
    <main className="scheduleBoardWrap" role="main" aria-label="Scheduling board">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Scheduling Board</h1>
            <p className="subtitle">
              Weekly dispatch planning, assignment visibility, and care visit coverage.
            </p>
          </div>

          <div className="scheduleBoardControls">
            <button className="btn" onClick={previousWeek}>
              &larr; Previous
            </button>

            <div className="scheduleRangePill">
              {formatDay(weekDays[0])} - {formatDay(weekDays[6])}
            </div>

            <button className="btn" onClick={nextWeek}>
              Next &rarr;
            </button>

            <select
              className="select scheduleRoleSelect"
              value={role}
              onChange={(e) => setRole(e.target.value as 'all' | 'nurse' | 'doctor')}
            >
              <option value="all">All professionals</option>
              <option value="nurse">Nurses only</option>
              <option value="doctor">Doctors only</option>
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="pageCard">
          <div className="empty">Loading scheduling board...</div>
        </section>
      ) : !board ? (
        <section className="pageCard">
          <div className="empty">No scheduling data available.</div>
        </section>
      ) : (
        <section className="scheduleBoardCard">
          <div className="scheduleBoardGridScroll">
            <div className="scheduleBoardHeaderRow">
              <div className="scheduleBoardCorner">Professional</div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="scheduleBoardDayHeader">
                  {formatDay(day)}
                </div>
              ))}
            </div>

            <div className="scheduleBoardGrid">
              {professionals.map((professional) => {
                const professionalVisits = visitsByProfessional.get(professional.id) || [];

                return (
                  <div key={professional.id} className="scheduleBoardRow">
                    <div className="scheduleBoardProfessionalCell">
                      <div className="scheduleProfessionalName">{professional.name}</div>
                      <div className="scheduleProfessionalMeta">
                        {String(professional.role).toUpperCase()}
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const dayVisits = professionalVisits
                        .filter((visit) => sameDay(visit.preferred_start, day))
                        .sort(
                          (a, b) =>
                            new Date(a.preferred_start).getTime() -
                            new Date(b.preferred_start).getTime()
                        );

                      return (
                        <div
                          key={`${professional.id}-${day.toISOString()}`}
                          className="scheduleBoardDayCell"
                        >
                          {dayVisits.length === 0 ? (
                            <div className="scheduleEmptyCell">-</div>
                          ) : (
                            <div className="scheduleVisitList">
                              {dayVisits.map((visit) => (
                                <div
                                  key={visit.id}
                                  className={`scheduleVisitCard scheduleVisitCard-${String(
                                    visit.urgency || 'medium'
                                  ).toLowerCase()}`}
                                >
                                  <div className="scheduleVisitTop">
                                    <span className="scheduleVisitTime">
                                      {formatTime(visit.preferred_start)}
                                    </span>
                                    <span className="scheduleVisitStatus">
                                      {String(visit.status).replace('_', ' ')}
                                    </span>
                                  </div>

                                  <div className="scheduleVisitTitle">
                                    {visit.client_name || 'Client'}
                                  </div>

                                  <div className="scheduleVisitMeta">
                                    {visit.service_type}
                                  </div>

                                  {visit.address_text ? (
                                    <div className="scheduleVisitMeta">
                                      {visit.address_text}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
