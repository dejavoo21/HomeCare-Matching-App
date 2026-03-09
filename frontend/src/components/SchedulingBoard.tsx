import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { api } from '../services/api';
import { RequestChatDrawer } from './RequestChatDrawer';

type Professional = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active?: boolean;
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
  evv_status?: 'not_started' | 'in_progress' | 'completed';
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  authorizationStatus?: 'ok' | 'warning' | 'missing' | 'expired' | 'exhausted';
  authorizationLabel?: string;
  hasConflict?: boolean;
  conflictLabel?: string;
  dailyVisitCount?: number;
  workloadStatus?: 'none' | 'normal' | 'busy' | 'overloaded';
  workloadLabel?: string;
  hasOvertimeRisk?: boolean;
  overtimeRiskLevel?: 'warn' | 'danger' | null;
};

type BoardResponse = {
  range: {
    start: string;
    end: string;
    days: number;
  } | null;
  professionals: Professional[];
  visits: Visit[];
};

type DragPayload = {
  requestId: string;
  fromProfessionalId: string | null;
  originalStart: string;
};

type ViewMode = 'day' | 'week';

type Client = {
  id: string;
  name: string;
  email: string;
};

type QuickCreateState = {
  professionalId: string;
  professionalName: string;
  day: string;
};

type QuickCreateMode = 'single' | 'recurring';

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

function mergeDateWithOriginalTime(targetDay: Date, originalDateTime: string) {
  const original = new Date(originalDateTime);
  const merged = new Date(targetDay);
  merged.setHours(
    original.getHours(),
    original.getMinutes(),
    original.getSeconds(),
    original.getMilliseconds()
  );
  return merged.toISOString();
}

function VisitFlags({ visit }: { visit: Visit }) {
  const flags: Array<{ label: string; className: string }> = [];

  if (visit.evv_status === 'completed') {
    flags.push({ label: 'EVV completed', className: 'visitFlag visitFlag-ok' });
  } else if (visit.evv_status === 'in_progress') {
    flags.push({ label: 'EVV in progress', className: 'visitFlag visitFlag-info' });
  } else if (visit.evv_status === 'not_started') {
    flags.push({ label: 'EVV not started', className: 'visitFlag visitFlag-muted' });
  }

  if (visit.authorizationLabel && visit.authorizationStatus === 'warning') {
    flags.push({
      label: visit.authorizationLabel,
      className: 'visitFlag visitFlag-warn',
    });
  }

  if (
    visit.authorizationLabel &&
    ['missing', 'expired', 'exhausted'].includes(visit.authorizationStatus || '')
  ) {
    flags.push({ label: visit.authorizationLabel, className: 'visitFlag visitFlag-danger' });
  }

  if (visit.authorizationLabel && visit.authorizationStatus === 'ok') {
    flags.push({ label: visit.authorizationLabel, className: 'visitFlag visitFlag-ok' });
  }

  if (visit.hasConflict) {
    flags.push({
      label: visit.conflictLabel || 'Schedule conflict',
      className: 'visitFlag visitFlag-info',
    });
  }

  if (
    visit.workloadLabel &&
    ['busy', 'overloaded'].includes(String(visit.workloadStatus || ''))
  ) {
    flags.push({
      label: visit.workloadLabel,
      className:
        visit.workloadStatus === 'overloaded'
          ? 'visitFlag visitFlag-danger'
          : 'visitFlag visitFlag-warn',
    });
  }

  if (visit.hasOvertimeRisk) {
    flags.push({
      label: 'OVERTIME RISK',
      className:
        visit.overtimeRiskLevel === 'danger'
          ? 'visitFlag visitFlag-danger'
          : 'visitFlag visitFlag-warn',
    });
  }

  if (flags.length === 0) {
    return null;
  }

  return (
    <div className="visitFlags">
      {flags.map((flag) => (
        <span key={flag.label} className={flag.className}>
          {flag.label}
        </span>
      ))}
    </div>
  );
}

export function SchedulingBoard() {
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [role, setRole] = useState<'all' | 'nurse' | 'doctor'>('all');
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dropBusy, setDropBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [quickCreate, setQuickCreate] = useState<QuickCreateState | null>(null);
  const [quickCreateBusy, setQuickCreateBusy] = useState(false);
  const [quickCreateMode, setQuickCreateMode] = useState<QuickCreateMode>('single');
  const [requestChatRequestId, setRequestChatRequestId] = useState<string | null>(null);
  const [quickCreateForm, setQuickCreateForm] = useState({
    clientId: '',
    professionalId: '',
    serviceType: 'MEDICATION_ADMIN',
    addressText: '',
    description: '',
    urgency: 'medium',
    preferredStart: '',
    recurrenceType: 'weekly',
    intervalValue: 2,
    occurrences: 4,
  });

  const load = async () => {
    try {
      setLoading(true);
      setLoadError('');
      setMessage('');
      const start = weekStart.toISOString().slice(0, 10);
      const days = viewMode === 'day' ? 1 : 7;
      const response = (await api.getScheduleBoard(start, days, role)) as any;
      const payload = response?.data || {};
      setBoard({
        range: payload.range || null,
        professionals: Array.isArray(payload.professionals) ? payload.professionals : [],
        visits: Array.isArray(payload.visits) ? payload.visits : [],
      });
    } catch (err: any) {
      console.error('Failed to load scheduling board:', err);
      setBoard({
        range: null,
        professionals: [],
        visits: [],
      });
      setLoadError(err?.message || 'Unable to load scheduling board right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [role, viewMode, weekStart]);

  useEffect(() => {
    async function loadClients() {
      try {
        const response = (await api.getClients()) as { data?: Client[] };
        setClients(response?.data || []);
      } catch (err) {
        console.error('Failed to load scheduling clients:', err);
      }
    }

    loadClients();
  }, []);

  const weekDays = useMemo(() => {
    const count = viewMode === 'day' ? 1 : 7;
    return Array.from({ length: count }).map((_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, [viewMode, weekStart]);

  const moveBackward = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() - (viewMode === 'day' ? 1 : 7));
    setWeekStart(date);
  };

  const moveForward = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + (viewMode === 'day' ? 1 : 7));
    setWeekStart(date);
  };

  const handleViewModeChange = (nextMode: ViewMode) => {
    setViewMode(nextMode);
    if (nextMode === 'week') {
      setWeekStart((current) => mondayOf(current));
    }
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

  const unassignedVisits = useMemo(() => {
    return [...(visitsByProfessional.get('unassigned') || [])].sort(
      (a, b) =>
        new Date(a.preferred_start).getTime() - new Date(b.preferred_start).getTime()
    );
  }, [visitsByProfessional]);

  const onDragStart = (event: DragEvent<HTMLDivElement>, visit: Visit) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', visit.id);
    setDragging({
      requestId: visit.id,
      fromProfessionalId: visit.professional_id || null,
      originalStart: visit.preferred_start,
    });
    setMessage('');
  };

  const onDragEnd = () => {
    setDragging(null);
  };

  const onDropVisit = async (professionalId: string, day: Date) => {
    if (!dragging) {
      return;
    }

    const preferredStart = mergeDateWithOriginalTime(day, dragging.originalStart);
    if (
      dragging.fromProfessionalId === professionalId &&
      new Date(dragging.originalStart).toISOString() === preferredStart
    ) {
      setDragging(null);
      return;
    }

    const dropKey = `${professionalId}-${day.toISOString()}`;

    try {
      setDropBusy(dropKey);
      setMessage('');
      await api.reassignSchedule({
        requestId: dragging.requestId,
        professionalId,
        preferredStart,
      });
      setMessage('Visit rescheduled successfully.');
      await load();
    } catch (err: any) {
      console.error('Failed to reschedule visit:', err);
      setMessage(err?.message || 'Failed to reschedule visit');
    } finally {
      setDropBusy(null);
      setDragging(null);
    }
  };

  const openQuickCreate = (professional: Professional, day: Date) => {
    const localDefault = new Date(day);
    localDefault.setHours(9, 0, 0, 0);
    const preferredStart = new Date(localDefault.getTime() - localDefault.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setQuickCreate({
      professionalId: professional.id,
      professionalName: professional.name,
      day: day.toISOString(),
    });
    setQuickCreateMode('single');
    setQuickCreateForm((current) => ({
      ...current,
      professionalId: professional.id,
      preferredStart,
    }));
    setMessage('');
  };

  const openUnassignedQuickCreate = () => {
    const localDefault = new Date(weekStart);
    localDefault.setHours(9, 0, 0, 0);
    const preferredStart = new Date(
      localDefault.getTime() - localDefault.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    setQuickCreate({
      professionalId: '',
      professionalName: 'Unassigned visit',
      day: localDefault.toISOString(),
    });
    setQuickCreateMode('single');
    setQuickCreateForm((current) => ({
      ...current,
      professionalId: '',
      preferredStart,
    }));
    setMessage('');
  };

  const closeQuickCreate = () => {
    setQuickCreate(null);
    setQuickCreateBusy(false);
    setQuickCreateMode('single');
    setQuickCreateForm({
      clientId: '',
      professionalId: '',
      serviceType: 'MEDICATION_ADMIN',
      addressText: '',
      description: '',
      urgency: 'medium',
      preferredStart: '',
      recurrenceType: 'weekly',
      intervalValue: 2,
      occurrences: 4,
    });
  };

  const submitQuickCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!quickCreate) {
      return;
    }

    try {
      setQuickCreateBusy(true);
      setMessage('');

      if (quickCreateMode === 'single') {
        await api.createSchedule({
          clientId: quickCreateForm.clientId,
          professionalId: quickCreateForm.professionalId || quickCreate.professionalId,
          serviceType: quickCreateForm.serviceType,
          addressText: quickCreateForm.addressText,
          description: quickCreateForm.description || undefined,
          urgency: quickCreateForm.urgency,
          preferredStart: new Date(quickCreateForm.preferredStart).toISOString(),
        });
      } else {
        await api.createRecurringSchedule({
          clientId: quickCreateForm.clientId,
          professionalId: quickCreateForm.professionalId || quickCreate.professionalId,
          serviceType: quickCreateForm.serviceType,
          addressText: quickCreateForm.addressText,
          description: quickCreateForm.description || undefined,
          urgency: quickCreateForm.urgency,
          startDateTime: new Date(quickCreateForm.preferredStart).toISOString(),
          recurrenceType: quickCreateForm.recurrenceType as 'daily' | 'every_x_days' | 'weekly',
          intervalValue:
            quickCreateForm.recurrenceType === 'every_x_days'
              ? Number(quickCreateForm.intervalValue || 1)
              : undefined,
          occurrences: Number(quickCreateForm.occurrences || 1),
        });
      }

      closeQuickCreate();
      setMessage(
        quickCreateMode === 'single'
          ? 'Visit created successfully.'
          : 'Recurring schedule created successfully.'
      );
      await load();
    } catch (err: any) {
      console.error('Failed to create visit from board:', err);
      setMessage(err?.message || 'Failed to create schedule');
      setQuickCreateBusy(false);
    }
  };

  const rangeLabel =
    viewMode === 'day'
      ? formatDay(weekDays[0])
      : `${formatDay(weekDays[0])} - ${formatDay(weekDays[weekDays.length - 1])}`;

  const boardColumns = `220px repeat(${weekDays.length}, minmax(${viewMode === 'day' ? 280 : 180}px, 1fr))`;
  const boardMinWidth = viewMode === 'day' ? '500px' : '1480px';

  return (
    <main className="scheduleBoardWrap" role="main" aria-label="Scheduling board">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Scheduling Board</h1>
            <p className="subtitle">
              Weekly dispatch planning, assignment visibility, and unassigned visit coverage.
            </p>
          </div>

          <div className="scheduleBoardControls">
            <div className="scheduleViewToggle" role="tablist" aria-label="Scheduling view mode">
              <button
                type="button"
                className={viewMode === 'day' ? 'scheduleViewToggleButton scheduleViewToggleButton-active' : 'scheduleViewToggleButton'}
                onClick={() => handleViewModeChange('day')}
                role="tab"
                aria-selected={viewMode === 'day'}
              >
                Day
              </button>
              <button
                type="button"
                className={viewMode === 'week' ? 'scheduleViewToggleButton scheduleViewToggleButton-active' : 'scheduleViewToggleButton'}
                onClick={() => handleViewModeChange('week')}
                role="tab"
                aria-selected={viewMode === 'week'}
              >
                Week
              </button>
            </div>

            <button className="btn" onClick={moveBackward}>
              &larr; Previous
            </button>

            <div className="scheduleRangePill">{rangeLabel}</div>

            <button className="btn" onClick={moveForward}>
              Next &rarr;
            </button>

            <select
              className="select scheduleRoleSelect"
              value={role}
              onChange={(event) => setRole(event.target.value as 'all' | 'nurse' | 'doctor')}
            >
              <option value="all">All professionals</option>
              <option value="nurse">Nurses only</option>
              <option value="doctor">Doctors only</option>
            </select>
          </div>
        </div>
      </section>

      {message ? (
        <section className="scheduleMessage" role="status" aria-live="polite">
          {message}
        </section>
      ) : null}

      {loading ? (
        <section className="pageCard scheduleStateCard">
          <div className="premiumEmptyState premiumEmptyState-compact">
            <div className="premiumEmptyTitle">Loading scheduling board</div>
            <div className="premiumEmptyText">
              Pulling assignments, professionals, and visit coverage for this date range.
            </div>
          </div>
        </section>
      ) : loadError ? (
        <section className="pageCard scheduleStateCard">
          <div className="premiumEmptyState premiumEmptyState-compact premiumEmptyState-danger">
            <div className="premiumEmptyTitle">Failed to load scheduling board</div>
            <div className="premiumEmptyText">{loadError}</div>
            <div className="premiumEmptyActions">
              <button className="btn btn-primary" onClick={load}>
                Retry board
              </button>
            </div>
          </div>
        </section>
      ) : !board || ((board.professionals || []).length === 0 && (board.visits || []).length === 0) ? (
        <section className="pageCard">
          <div className="premiumEmptyState">
            <div className="premiumEmptyTitle">No visits in this date range yet</div>
            <div className="premiumEmptyText">
              Create a one-time or recurring visit, or drag unassigned work into the board once
              requests exist.
            </div>
            <div className="premiumEmptyActions">
              <button className="btn btn-primary" onClick={openUnassignedQuickCreate}>
                Create Visit
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="scheduleUnassignedCard">
            <div className="scheduleUnassignedHeader">
              <div>
                <h3 className="scheduleUnassignedTitle">Unassigned Visits</h3>
                <p className="scheduleUnassignedSubtitle">
                  Drag these visits onto a professional&apos;s day column to assign them.
                </p>
              </div>

              <div className="scheduleUnassignedCount">{unassignedVisits.length} pending</div>
            </div>

            {unassignedVisits.length === 0 ? (
              <div className="empty">No unassigned visits for this week.</div>
            ) : (
              <div className="scheduleUnassignedList">
                {unassignedVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className={`scheduleVisitCard scheduleVisitCard-unassigned scheduleVisitCard-${String(
                      visit.urgency || 'medium'
                    ).toLowerCase()}`}
                    draggable
                    onDragStart={(event) => onDragStart(event, visit)}
                    onDragEnd={onDragEnd}
                  >
                    <div className="scheduleVisitTop">
                      <span className="scheduleVisitTime">
                        {formatDay(new Date(visit.preferred_start))} - {formatTime(visit.preferred_start)}
                      </span>
                      <span className="scheduleVisitStatus">
                        {String(visit.status).replace('_', ' ')}
                      </span>
                    </div>

                    <div className="scheduleVisitTitle">{visit.client_name || 'Client'}</div>
                    <VisitFlags visit={visit} />
                    <div className="scheduleVisitMeta">{visit.service_type}</div>

                    {visit.address_text ? (
                      <div className="scheduleVisitMeta">{visit.address_text}</div>
                    ) : null}

                    <button
                      type="button"
                      className="scheduleVisitThreadBtn"
                      onClick={(event) => {
                        event.stopPropagation();
                        setRequestChatRequestId(visit.id);
                      }}
                    >
                      Thread
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="scheduleBoardCard">
            <div className="scheduleBoardGridScroll">
              <div className="scheduleBoardHeaderRow" style={{ gridTemplateColumns: boardColumns, minWidth: boardMinWidth }}>
                <div className="scheduleBoardCorner">Professional</div>
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="scheduleBoardDayHeader">
                    {formatDay(day)}
                  </div>
                ))}
              </div>

              <div className="scheduleBoardGrid" style={{ minWidth: boardMinWidth }}>
                {(board.professionals || []).map((professional) => {
                  const professionalVisits = visitsByProfessional.get(professional.id) || [];

                  return (
                    <div key={professional.id} className="scheduleBoardRow" style={{ gridTemplateColumns: boardColumns }}>
                      <div className="scheduleBoardProfessionalCell">
                        <div className="scheduleProfessionalName">{professional.name}</div>
                        <div className="scheduleProfessionalMeta">
                          {String(professional.role).toUpperCase()}
                        </div>
                        <div className="scheduleProfessionalLoadMeta">
                          {professionalVisits.length} visits this {viewMode === 'day' ? 'day' : 'week'}
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

                        const dropKey = `${professional.id}-${day.toISOString()}`;
                        const isBusy = dropBusy === dropKey;

                        return (
                          <div
                            key={`${professional.id}-${day.toISOString()}`}
                            className={
                              dragging
                                ? 'scheduleBoardDayCell scheduleBoardDayCell-droppable'
                                : 'scheduleBoardDayCell'
                            }
                            onDragOver={(event) => {
                              event.preventDefault();
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              onDropVisit(professional.id, day);
                            }}
                          >
                            <button
                              type="button"
                              className="scheduleCreateButton"
                              onClick={() => openQuickCreate(professional, day)}
                            >
                              + Create
                            </button>

                            {dayVisits.length > 0 ? (
                              <div className="scheduleDayLoad">
                                {dayVisits.length} visit{dayVisits.length === 1 ? '' : 's'}
                              </div>
                            ) : null}

                            {dayVisits.length === 0 ? (
                              <div className="scheduleEmptyCell">
                                {isBusy ? 'Updating...' : 'Drop here'}
                              </div>
                            ) : (
                              <div className="scheduleVisitList">
                                {dayVisits.map((visit) => (
                                  <div
                                    key={visit.id}
                                    className={`scheduleVisitCard scheduleVisitCard-${String(
                                      visit.urgency || 'medium'
                                    ).toLowerCase()}`}
                                    draggable
                                    onDragStart={(event) => onDragStart(event, visit)}
                                    onDragEnd={onDragEnd}
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
                                    <VisitFlags visit={visit} />
                                    <div className="scheduleVisitMeta">{visit.service_type}</div>

                                    {visit.address_text ? (
                                      <div className="scheduleVisitMeta">{visit.address_text}</div>
                                    ) : null}

                                    <button
                                      type="button"
                                      className="scheduleVisitThreadBtn"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setRequestChatRequestId(visit.id);
                                      }}
                                    >
                                      Thread
                                    </button>
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
        </>
      )}

      {quickCreate ? (
        <div className="scheduleQuickCreateOverlay" onClick={closeQuickCreate}>
          <section
            className="scheduleQuickCreateCard"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="scheduleQuickCreateHeader">
              <div>
                <h3 className="settingsCardTitle">Create from Board</h3>
                <p className="settingsCardText">
                  {quickCreate.professionalName} on {formatDay(new Date(quickCreate.day))}
                </p>
                <p className="modalSub">
                  Create a one-time visit or a recurring schedule directly from the scheduling
                  board.
                </p>
              </div>
              <button
                type="button"
                className="scheduleQuickCreateClose"
                onClick={closeQuickCreate}
              >
                ×
              </button>
            </div>

            <div className="createModeToggle" role="tablist" aria-label="Create mode">
              <button
                type="button"
                className={
                  quickCreateMode === 'single'
                    ? 'createModeBtn createModeBtn-active'
                    : 'createModeBtn'
                }
                onClick={() => setQuickCreateMode('single')}
                role="tab"
                aria-selected={quickCreateMode === 'single'}
              >
                One Visit
              </button>
              <button
                type="button"
                className={
                  quickCreateMode === 'recurring'
                    ? 'createModeBtn createModeBtn-active'
                    : 'createModeBtn'
                }
                onClick={() => setQuickCreateMode('recurring')}
                role="tab"
                aria-selected={quickCreateMode === 'recurring'}
              >
                Recurring
              </button>
            </div>

            <form className="recurringGrid" onSubmit={submitQuickCreate}>
              <div className="formGroup">
                <label className="formLabel">Client</label>
                <select
                  className="select"
                  value={quickCreateForm.clientId}
                  onChange={(event) =>
                    setQuickCreateForm((current) => ({
                      ...current,
                      clientId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label className="formLabel">Professional</label>
                <select
                  className="select"
                  value={quickCreateForm.professionalId}
                  onChange={(event) =>
                    setQuickCreateForm((current) => ({
                      ...current,
                      professionalId: event.target.value,
                    }))
                  }
                >
                  <option value="">Unassigned</option>
                  {(board?.professionals || []).map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.name} ({professional.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label className="formLabel">Service Type</label>
                <input
                  className="input"
                  value={quickCreateForm.serviceType}
                  onChange={(event) =>
                    setQuickCreateForm((current) => ({
                      ...current,
                      serviceType: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="formGroup">
                <label className="formLabel">Urgency</label>
                <select
                  className="select"
                  value={quickCreateForm.urgency}
                  onChange={(event) =>
                    setQuickCreateForm((current) => ({
                      ...current,
                      urgency: event.target.value,
                    }))
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="formGroup recurringGrid-full">
                <label className="formLabel">Address</label>
                <input
                  className="input"
                  value={quickCreateForm.addressText}
                  onChange={(event) =>
                    setQuickCreateForm((current) => ({
                      ...current,
                      addressText: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="formGroup recurringGrid-full">
                <label className="formLabel">Description</label>
                <textarea
                  className="input recurringTextarea"
                  rows={3}
                  value={quickCreateForm.description}
                  onChange={(event) =>
                    setQuickCreateForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="formGroup">
                <label className="formLabel">
                  {quickCreateMode === 'single' ? 'Date & Time' : 'Start Date & Time'}
                </label>
                <input
                  className="input"
                  type="datetime-local"
                  value={quickCreateForm.preferredStart}
                  onChange={(event) =>
                    setQuickCreateForm((current) => ({
                      ...current,
                      preferredStart: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              {quickCreateMode === 'recurring' ? (
                <>
                  <div className="formGroup">
                    <label className="formLabel">Recurrence</label>
                    <select
                      className="select"
                      value={quickCreateForm.recurrenceType}
                      onChange={(event) =>
                        setQuickCreateForm((current) => ({
                          ...current,
                          recurrenceType: event.target.value,
                        }))
                      }
                    >
                      <option value="daily">Daily</option>
                      <option value="every_x_days">Every X days</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  {quickCreateForm.recurrenceType === 'every_x_days' ? (
                    <div className="formGroup">
                      <label className="formLabel">Interval (days)</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={30}
                        value={quickCreateForm.intervalValue}
                        onChange={(event) =>
                          setQuickCreateForm((current) => ({
                            ...current,
                            intervalValue: Number(event.target.value),
                          }))
                        }
                      />
                    </div>
                  ) : null}

                  <div className="formGroup">
                    <label className="formLabel">Occurrences</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={30}
                      value={quickCreateForm.occurrences}
                      onChange={(event) =>
                        setQuickCreateForm((current) => ({
                          ...current,
                          occurrences: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                </>
              ) : null}

              <div className="recurringActions recurringGrid-full">
                <button type="submit" className="btn btn-primary" disabled={quickCreateBusy}>
                  {quickCreateBusy
                    ? 'Saving...'
                    : quickCreateMode === 'single'
                      ? 'Create Visit'
                      : 'Create Recurring Schedule'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <RequestChatDrawer
        open={!!requestChatRequestId}
        requestId={requestChatRequestId}
        onClose={() => setRequestChatRequestId(null)}
      />
    </main>
  );
}
