import { useEffect, useMemo, useState } from 'react';
import { AdminClinicianReviewActions } from './AdminClinicianReviewActions';
import { AdminFollowUpCreateBox } from './AdminFollowUpCreateBox';
import { api } from '../services/api';

type ReviewItem = {
  id: string;
  professional_id?: string;
  client_name?: string;
  professional_name?: string;
  professional_role?: string;
  service_type?: string;
  address_text?: string;
  preferred_start?: string;
  urgency?: string;
  status?: string;
  description?: string;
  evv_status?: string;
  visit_notes?: string;
  visit_outcome?: string;
  follow_up_required?: boolean;
  escalation_required?: boolean;
  documented_at?: string | null;
  admin_follow_up_scheduled?: boolean;
  admin_escalation_acknowledged?: boolean;
  admin_issue_resolved?: boolean;
  admin_review_notes?: string;
  admin_reviewed_at?: string | null;
  admin_reviewed_by?: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

export function AdminClinicianNotesReview() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    outcome: '',
    documented: 'all',
    followUpRequired: 'all',
    escalationRequired: 'all',
  });

  const load = async () => {
    try {
      setLoading(true);

      const response = (await api.getClinicianAdminReview({
        outcome: filters.outcome || undefined,
        documented: filters.documented === 'all' ? undefined : filters.documented === 'true',
        followUpRequired:
          filters.followUpRequired === 'all'
            ? undefined
            : filters.followUpRequired === 'true',
        escalationRequired:
          filters.escalationRequired === 'all'
            ? undefined
            : filters.escalationRequired === 'true',
        limit: 100,
      })) as { data?: ReviewItem[] };

      setItems(response?.data || []);
    } catch (err) {
      console.error('Failed to load clinician review:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  const summary = useMemo(() => {
    const rows = items || [];
    return {
      total: rows.length,
      documented: rows.filter((row) => !!row.documented_at).length,
      followUp: rows.filter((row) => !!row.follow_up_required).length,
      escalation: rows.filter((row) => !!row.escalation_required).length,
    };
  }, [items]);

  return (
    <div className="pageStack">
      <section className="reviewSummaryGrid">
        <div className="reviewSummaryCard">
          <div className="settingsOverviewLabel">Total Visits</div>
          <div className="settingsOverviewValue">{summary.total}</div>
        </div>
        <div className="reviewSummaryCard">
          <div className="settingsOverviewLabel">Documented</div>
          <div className="settingsOverviewValue">{summary.documented}</div>
        </div>
        <div className="reviewSummaryCard">
          <div className="settingsOverviewLabel">Follow-up Needed</div>
          <div className="settingsOverviewValue">{summary.followUp}</div>
        </div>
        <div className="reviewSummaryCard">
          <div className="settingsOverviewLabel">Escalations</div>
          <div className="settingsOverviewValue">{summary.escalation}</div>
        </div>
      </section>

      <section className="pageCard">
        <div className="reviewFilters">
          <select
            className="select"
            value={filters.outcome}
            onChange={(event) =>
              setFilters((current) => ({ ...current, outcome: event.target.value }))
            }
          >
            <option value="">All outcomes</option>
            <option value="completed_successfully">Completed successfully</option>
            <option value="partial">Partial</option>
            <option value="no_access">No access</option>
            <option value="escalated">Escalated</option>
            <option value="follow_up_required">Follow-up required</option>
          </select>

          <select
            className="select"
            value={filters.documented}
            onChange={(event) =>
              setFilters((current) => ({ ...current, documented: event.target.value }))
            }
          >
            <option value="all">All documentation</option>
            <option value="true">Documented</option>
            <option value="false">Undocumented</option>
          </select>

          <select
            className="select"
            value={filters.followUpRequired}
            onChange={(event) =>
              setFilters((current) => ({ ...current, followUpRequired: event.target.value }))
            }
          >
            <option value="all">All follow-up</option>
            <option value="true">Follow-up required</option>
            <option value="false">No follow-up</option>
          </select>

          <select
            className="select"
            value={filters.escalationRequired}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                escalationRequired: event.target.value,
              }))
            }
          >
            <option value="all">All escalations</option>
            <option value="true">Escalation required</option>
            <option value="false">No escalation</option>
          </select>
        </div>

        {loading ? (
          <div className="empty">Loading clinician review...</div>
        ) : items.length === 0 ? (
          <div className="empty">No documented visits match your filters.</div>
        ) : (
          <div className="reviewList">
            {items.map((item) => (
              <div key={item.id} className="reviewCard">
                <div className="reviewCardTop">
                  <div>
                    <div className="reviewCardTitle">
                      {item.client_name || 'Client'} - {item.service_type || 'Visit'}
                    </div>
                    <div className="reviewCardMeta">
                      {item.professional_name || '-'}
                      {item.professional_role ? ` (${item.professional_role})` : ''} -{' '}
                      {formatDateTime(item.preferred_start)}
                    </div>
                  </div>

                  <div className="reviewBadges">
                    {item.visit_outcome ? (
                      <span className="reviewBadge reviewBadge-neutral">
                        {String(item.visit_outcome).split('_').join(' ')}
                      </span>
                    ) : null}

                    {item.follow_up_required ? (
                      <span className="reviewBadge reviewBadge-warn">Follow-up</span>
                    ) : null}

                    {item.escalation_required ? (
                      <span className="reviewBadge reviewBadge-danger">Escalation</span>
                    ) : null}

                    {item.admin_follow_up_scheduled ? (
                      <span className="reviewBadge reviewBadge-ok">Follow-up scheduled</span>
                    ) : null}

                    {item.admin_escalation_acknowledged ? (
                      <span className="reviewBadge reviewBadge-ok">
                        Escalation acknowledged
                      </span>
                    ) : null}

                    {item.admin_issue_resolved ? (
                      <span className="reviewBadge reviewBadge-ok">Resolved</span>
                    ) : null}

                    {item.documented_at ? (
                      <span className="reviewBadge reviewBadge-ok">Documented</span>
                    ) : (
                      <span className="reviewBadge reviewBadge-neutral">Undocumented</span>
                    )}
                  </div>
                </div>

                {item.address_text ? <div className="reviewCardMeta">{item.address_text}</div> : null}

                <div className="reviewSection">
                  <div className="reviewSectionLabel">Visit Notes</div>
                  <div className="reviewSectionText">
                    {item.visit_notes || 'No visit notes provided.'}
                  </div>
                </div>

                <AdminClinicianReviewActions
                  requestId={item.id}
                  initialFollowUpScheduled={!!item.admin_follow_up_scheduled}
                  initialEscalationAcknowledged={!!item.admin_escalation_acknowledged}
                  initialIssueResolved={!!item.admin_issue_resolved}
                  initialReviewNotes={item.admin_review_notes || ''}
                  onSaved={load}
                />

                {item.follow_up_required && !item.admin_follow_up_scheduled ? (
                  <AdminFollowUpCreateBox
                    sourceRequestId={item.id}
                    defaultProfessionalId={item.professional_id || ''}
                    defaultUrgency={item.urgency || 'medium'}
                    defaultDescription={item.description || item.service_type || 'Follow-up visit'}
                    onCreated={load}
                  />
                ) : null}

                <div className="reviewFoot">
                  <span>EVV: {item.evv_status || 'not_started'}</span>
                  <span>Documented: {formatDateTime(item.documented_at)}</span>
                  <span>Reviewed: {formatDateTime(item.admin_reviewed_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
