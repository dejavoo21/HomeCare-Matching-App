import { useEffect, useMemo, useState } from 'react';
import { ClinicianVisitDocumentation } from '../components/ClinicianVisitDocumentation';
import { EvvVisitPanel } from '../components/EvvVisitPanel';
import { api } from '../services/api';

type Visit = {
  id: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  service_type: string;
  address_text?: string;
  preferred_start: string;
  urgency: string;
  status: string;
  description?: string;
  evv_status?: 'not_started' | 'in_progress' | 'completed';
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  visit_notes?: string;
  visit_outcome?: string;
  follow_up_required?: boolean;
  escalation_required?: boolean;
  documented_at?: string | null;
};

type TabType = 'today' | 'upcoming' | 'completed';

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isFuture(dateStr: string) {
  return new Date(dateStr).getTime() > Date.now();
}

function formatDayTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ClinicianVisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [tab, setTab] = useState<TabType>('today');

  const load = async () => {
    try {
      setLoading(true);
      const response = (await api.getMyClinicianVisits()) as { data?: Visit[] };
      const nextVisits = response?.data || [];
      setVisits(nextVisits);
      setSelectedVisit((current) =>
        current ? nextVisits.find((visit) => visit.id === current.id) || current : current
      );
    } catch (err) {
      console.error('Failed to load clinician visits:', err);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (tab === 'today') {
      return visits.filter((visit) => isToday(visit.preferred_start));
    }

    if (tab === 'upcoming') {
      return visits.filter(
        (visit) =>
          !isToday(visit.preferred_start) &&
          isFuture(visit.preferred_start) &&
          String(visit.status).toLowerCase() !== 'completed'
      );
    }

    return visits.filter((visit) => String(visit.status).toLowerCase() === 'completed');
  }, [tab, visits]);

  return (
    <main className="clinicianShell" role="main" aria-label="Clinician visits">
      <section className="clinicianHeader">
        <div>
          <h1 className="clinicianTitle">My Visits</h1>
          <p className="clinicianSubtitle">Today's care visits and EVV actions</p>
        </div>

        <button className="btn btn-primary clinicianRefreshBtn" onClick={load}>
          Refresh
        </button>
      </section>

      <section className="clinicianTabs" role="tablist" aria-label="Visit filters">
        <button
          className={tab === 'today' ? 'clinicianTab clinicianTab-active' : 'clinicianTab'}
          onClick={() => setTab('today')}
          role="tab"
          aria-selected={tab === 'today'}
        >
          Today
        </button>
        <button
          className={tab === 'upcoming' ? 'clinicianTab clinicianTab-active' : 'clinicianTab'}
          onClick={() => setTab('upcoming')}
          role="tab"
          aria-selected={tab === 'upcoming'}
        >
          Upcoming
        </button>
        <button
          className={tab === 'completed' ? 'clinicianTab clinicianTab-active' : 'clinicianTab'}
          onClick={() => setTab('completed')}
          role="tab"
          aria-selected={tab === 'completed'}
        >
          Completed
        </button>
      </section>

      {loading ? (
        <div className="pageCard">
          <div className="empty">Loading visits...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pageCard">
          <div className="empty">No visits found for this section.</div>
        </div>
      ) : (
        <section className="clinicianVisitList">
          {filtered.map((visit) => (
            <button
              key={visit.id}
              type="button"
              className="clinicianVisitCard"
              onClick={() => setSelectedVisit(visit)}
            >
              <div className="clinicianVisitTop">
                <div>
                  <div className="clinicianVisitClient">{visit.client_name || 'Client'}</div>
                  <div className="clinicianVisitMeta">{visit.service_type}</div>
                </div>

                <span className={`clinicianEvvBadge clinicianEvvBadge-${visit.evv_status || 'not_started'}`}>
                  {String(visit.evv_status || 'not_started').replace('_', ' ')}
                </span>
              </div>

              <div className="clinicianVisitMeta">{formatDayTime(visit.preferred_start)}</div>

              {visit.address_text ? (
                <div className="clinicianVisitMeta">{visit.address_text}</div>
              ) : null}

              <div className="clinicianVisitFooter">
                <span className={`clinicianUrgency clinicianUrgency-${String(visit.urgency).toLowerCase()}`}>
                  {String(visit.urgency).toUpperCase()}
                </span>
                <div className="clinicianVisitFooterRight">
                  {visit.documented_at ? (
                    <span className="clinicianDocBadge">Documented</span>
                  ) : null}
                  <span className="clinicianOpenText">Open</span>
                </div>
              </div>
            </button>
          ))}
        </section>
      )}

      {selectedVisit ? (
        <div className="clinicianDrawerOverlay" onClick={() => setSelectedVisit(null)}>
          <div
            className="clinicianDrawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="visitDetailTitle"
          >
            <div className="clinicianDrawerHead">
              <div>
                <h2 id="visitDetailTitle" className="clinicianDrawerTitle">
                  {selectedVisit.client_name || 'Visit Details'}
                </h2>
                <p className="clinicianDrawerSub">{selectedVisit.service_type}</p>
              </div>

              <button className="btn btn-small" onClick={() => setSelectedVisit(null)}>
                Close
              </button>
            </div>

            <div className="clinicianDetailGrid">
              <div className="clinicianDetailItem">
                <span className="clinicianDetailLabel">Time</span>
                <strong>{formatDayTime(selectedVisit.preferred_start)}</strong>
              </div>

              <div className="clinicianDetailItem">
                <span className="clinicianDetailLabel">Urgency</span>
                <strong>{String(selectedVisit.urgency).toUpperCase()}</strong>
              </div>

              <div className="clinicianDetailItem clinicianDetailItem-full">
                <span className="clinicianDetailLabel">Address</span>
                <strong>{selectedVisit.address_text || '-'}</strong>
              </div>

              <div className="clinicianDetailItem clinicianDetailItem-full">
                <span className="clinicianDetailLabel">Description</span>
                <strong>{selectedVisit.description || '-'}</strong>
              </div>

              <div className="clinicianDetailItem clinicianDetailItem-full">
                <span className="clinicianDetailLabel">Client Contact</span>
                <strong>{selectedVisit.client_phone || selectedVisit.client_email || '-'}</strong>
              </div>
            </div>

            <EvvVisitPanel requestId={selectedVisit.id} />

            <ClinicianVisitDocumentation
              requestId={selectedVisit.id}
              initialNotes={selectedVisit.visit_notes || ''}
              initialOutcome={selectedVisit.visit_outcome || ''}
              initialFollowUpRequired={!!selectedVisit.follow_up_required}
              initialEscalationRequired={!!selectedVisit.escalation_required}
              onSaved={load}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
