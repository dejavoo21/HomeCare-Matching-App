import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasAnyPermission, hasPermission } from '../lib/auth/access';
import { PERMISSIONS } from '../lib/auth/permissions';
import { verificationBadgeVariant } from '../lib/ui/statusMaps';
import { api } from '../services/api';
import LockedField from './auth/LockedField';
import PermissionNotice from './auth/PermissionNotice';
import ProtectedAction from './auth/ProtectedAction';
import Badge from './ui/Badge';
import Button from './ui/Button';
import EmptyState from './ui/states/EmptyState';
import LoadingState from './ui/states/LoadingState';

type AccessRequestRow = {
  id: string;
  requester_name?: string | null;
  requester_email: string;
  requested_role: string;
  reason?: string | null;
  status: string;
  reviewed_at?: string | null;
  created_at: string;
  reviewer_email?: string | null;
  review_notes?: string | null;
  additional_info_requested?: boolean;
  additional_info_note?: string | null;
  identity_verified?: boolean;
  license_verified?: boolean;
  compliance_verified?: boolean;
  background_check_verified?: boolean;
  verification_completed?: boolean;
};

type VerificationDraft = {
  additionalInfoRequested: boolean;
  additionalInfoNote: string;
  identityVerified: boolean;
  licenseVerified: boolean;
  complianceVerified: boolean;
  backgroundCheckVerified: boolean;
  reviewNotes: string;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function createDraft(item: AccessRequestRow): VerificationDraft {
  return {
    additionalInfoRequested: !!item.additional_info_requested,
    additionalInfoNote: item.additional_info_note || '',
    identityVerified: !!item.identity_verified,
    licenseVerified: !!item.license_verified,
    complianceVerified: !!item.compliance_verified,
    backgroundCheckVerified: !!item.background_check_verified,
    reviewNotes: item.review_notes || '',
  };
}

function normalizeVerificationStatus(item: AccessRequestRow) {
  if (item.verification_completed) return 'verified';
  if (item.additional_info_requested) return 'info_requested';
  if (item.status === 'rejected') return 'rejected';
  return 'pending_review';
}

export function AccessRequestsPanel({
  refreshKey,
  hideSummary = false,
}: {
  refreshKey?: number;
  hideSummary?: boolean;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<AccessRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<Record<string, VerificationDraft>>({});

  const load = async () => {
    try {
      setLoading(true);
      const response = (await api.getAccessRequests()) as any;
      const rows = Array.isArray(response?.data) ? response.data : [];
      setItems(rows);
      setDrafts((previous) => {
        const next = { ...previous };
        for (const item of rows) {
          next[item.id] = previous[item.id] || createDraft(item);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to load access requests:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const summary = useMemo(
    () => ({
      pending: items.filter((item) => item.status === 'pending').length,
      infoRequested: items.filter((item) => item.additional_info_requested).length,
      verified: items.filter((item) => item.verification_completed).length,
    }),
    [items]
  );

  const updateDraft = (id: string, patch: Partial<VerificationDraft>) => {
    setDrafts((previous) => ({
      ...previous,
      [id]: {
        ...(previous[id] || {
          additionalInfoRequested: false,
          additionalInfoNote: '',
          identityVerified: false,
          licenseVerified: false,
          complianceVerified: false,
          backgroundCheckVerified: false,
          reviewNotes: '',
        }),
        ...patch,
      },
    }));
  };

  const saveVerification = async (item: AccessRequestRow) => {
    const draft = drafts[item.id];
    if (!draft) return;

    try {
      setBusyId(item.id);
      setMessage('');
      await api.saveAccessVerification({
        requestId: item.id,
        additionalInfoRequested: draft.additionalInfoRequested,
        additionalInfoNote: draft.additionalInfoNote || undefined,
        identityVerified: draft.identityVerified,
        licenseVerified: draft.licenseVerified,
        complianceVerified: draft.complianceVerified,
        backgroundCheckVerified: draft.backgroundCheckVerified,
      });
      await load();
      setMessage('Verification workflow updated.');
    } catch (err: any) {
      console.error('Failed to save access verification:', err);
      setMessage(err?.message || 'Failed to save verification workflow');
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (item: AccessRequestRow, decision: 'approved' | 'rejected') => {
    const draft = drafts[item.id];

    try {
      setBusyId(item.id);
      setMessage('');
      if (draft) {
        await api.saveAccessVerification({
          requestId: item.id,
          additionalInfoRequested: draft.additionalInfoRequested,
          additionalInfoNote: draft.additionalInfoNote || undefined,
          identityVerified: draft.identityVerified,
          licenseVerified: draft.licenseVerified,
          complianceVerified: draft.complianceVerified,
          backgroundCheckVerified: draft.backgroundCheckVerified,
        });
      }
      await api.decideAccessRequest(item.id, decision, draft?.reviewNotes || undefined);
      await load();
      setMessage(
        decision === 'approved' ? 'Access request approved.' : 'Access request rejected.'
      );
    } catch (err: any) {
      console.error(`Failed to ${decision} access request:`, err);
      setMessage(err?.message || `Failed to ${decision} access request`);
    } finally {
      setBusyId(null);
    }
  };

  const canReview = hasPermission(user, PERMISSIONS.ACCESS_REQUESTS_REVIEW);
  const reviewOnly = !hasAnyPermission(user, [
    PERMISSIONS.ACCESS_REQUESTS_REVIEW,
    PERMISSIONS.ACCESS_REQUESTS_VERIFY,
    PERMISSIONS.ACCESS_REQUESTS_REQUEST_INFO,
  ]);

  return (
    <div className="sideCard accessWorkflowCard" aria-label="Access requests">
      <div className="sideHeader">
        <div>
          <h3 className="sideTitle">Access Requests</h3>
          <p className="muted">
            Review evidence, request missing information, and unlock onboarding only when the record is ready.
          </p>
        </div>
      </div>

      <div className="rowGap">
        {!loading && !hideSummary ? (
          <div className="accessWorkflowSummary">
            <div className="accessWorkflowMetric accessWorkflowMetric-neutral">
              <span className="accessWorkflowMetricLabel">Pending</span>
              <strong className="accessWorkflowMetricValue">{summary.pending}</strong>
            </div>
            <div className="accessWorkflowMetric accessWorkflowMetric-warn">
              <span className="accessWorkflowMetricLabel">Info Requested</span>
              <strong className="accessWorkflowMetricValue">{summary.infoRequested}</strong>
            </div>
            <div className="accessWorkflowMetric accessWorkflowMetric-good">
              <span className="accessWorkflowMetricLabel">Verified</span>
              <strong className="accessWorkflowMetricValue">{summary.verified}</strong>
            </div>
          </div>
        ) : null}

        {message ? (
          <div className="recurringMessage" role="status" aria-live="polite">
            {message}
          </div>
        ) : null}

        {loading ? (
          <LoadingState rows={4} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No access requests found"
            description="New onboarding requests will appear here for review and verification."
          />
        ) : (
          <div className="accessList">
            {items.map((item) => {
              const draft = drafts[item.id] || createDraft(item);
              const verificationCompleted =
                draft.identityVerified &&
                draft.licenseVerified &&
                draft.complianceVerified &&
                draft.backgroundCheckVerified;
              const clientRequest = String(item.requested_role).toLowerCase() === 'client';

              return (
                <article key={item.id} className="accessWorkflowItem">
                  <div className="accessTop">
                    <div>
                      <div className="accessTitle">{item.requester_name || item.requester_email}</div>
                      <div className="accessMeta muted">
                        {item.requester_email} | {String(item.requested_role).toUpperCase()}
                      </div>
                    </div>

                    <div className="accessBadgeStack">
                      <Badge
                        variant={verificationBadgeVariant[normalizeVerificationStatus(item)] || 'neutral'}
                      >
                        {normalizeVerificationStatus(item).replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      {verificationCompleted ? (
                        <Badge variant="success">VERIFIED</Badge>
                      ) : (
                        <Badge variant="info">VERIFICATION PENDING</Badge>
                      )}
                    </div>
                  </div>

                  {item.reason ? <div className="accessReason">{item.reason}</div> : null}

                  <div className="accessDates muted">
                    Requested: {formatDate(item.created_at)}
                    {item.reviewed_at ? ` | Reviewed: ${formatDate(item.reviewed_at)}` : ''}
                    {item.reviewer_email ? ` | Reviewer: ${item.reviewer_email}` : ''}
                  </div>

                  <div className="accessWorkflowChecks">
                    <Badge variant={draft.identityVerified ? 'success' : 'neutral'}>Identity</Badge>
                    <Badge variant={draft.licenseVerified ? 'success' : 'neutral'}>License</Badge>
                    <Badge variant={draft.complianceVerified ? 'success' : 'neutral'}>
                      Compliance
                    </Badge>
                    <Badge variant={draft.backgroundCheckVerified ? 'success' : 'neutral'}>
                      Background
                    </Badge>
                  </div>

                  <div className="verificationPanel">
                    <div className="verificationTitle">Verification</div>

                    {reviewOnly ? (
                      <PermissionNotice description="You can view this verification record, but approval, rejection, and information-request actions are restricted to authorized reviewers." />
                    ) : null}

                    <div className="documentationChecks">
                      <label className="checkRow">
                        <input
                          type="checkbox"
                          checked={draft.identityVerified}
                          onChange={(event) =>
                            updateDraft(item.id, { identityVerified: event.target.checked })
                          }
                          disabled={!canReview}
                        />
                        <span>Identity verified</span>
                      </label>

                      <label className="checkRow">
                        <input
                          type="checkbox"
                          checked={draft.licenseVerified}
                          onChange={(event) =>
                            updateDraft(item.id, { licenseVerified: event.target.checked })
                          }
                          disabled={!canReview}
                        />
                        <span>License verified</span>
                      </label>

                      <label className="checkRow">
                        <input
                          type="checkbox"
                          checked={draft.complianceVerified}
                          onChange={(event) =>
                            updateDraft(item.id, { complianceVerified: event.target.checked })
                          }
                          disabled={!canReview}
                        />
                        <span>Compliance documents verified</span>
                      </label>

                      <label className="checkRow">
                        <input
                          type="checkbox"
                          checked={draft.backgroundCheckVerified}
                          onChange={(event) =>
                            updateDraft(item.id, { backgroundCheckVerified: event.target.checked })
                          }
                          disabled={!canReview}
                        />
                        <span>Background check verified</span>
                      </label>
                    </div>

                    <div className="accessVerificationGrid">
                      <LockedField
                        permission={PERMISSIONS.ACCESS_REQUESTS_REQUEST_INFO}
                        label="Additional information request"
                        deniedReason="Review only"
                        readOnlyValue={
                          draft.additionalInfoRequested
                            ? draft.additionalInfoNote || 'Additional information has been requested.'
                            : 'No additional information request has been raised.'
                        }
                      >
                        <div className="space-y-3">
                          <label className="checkRow">
                            <input
                              type="checkbox"
                              checked={draft.additionalInfoRequested}
                              onChange={(event) =>
                                updateDraft(item.id, {
                                  additionalInfoRequested: event.target.checked,
                                })
                              }
                            />
                            <span>Request additional information</span>
                          </label>

                          <textarea
                            className="input accessTextarea"
                            rows={3}
                            value={draft.additionalInfoNote}
                            onChange={(event) =>
                              updateDraft(item.id, { additionalInfoNote: event.target.value })
                            }
                            placeholder="List missing documents, certifications, or identity proof..."
                          />
                        </div>
                      </LockedField>

                      <LockedField
                        permission={PERMISSIONS.ACCESS_REQUESTS_REVIEW}
                        label="Verification note"
                        deniedReason="Review only"
                        readOnlyValue={draft.reviewNotes || 'No internal review note available.'}
                      >
                        <textarea
                          className="input accessTextarea"
                          rows={3}
                          value={draft.reviewNotes}
                          onChange={(event) =>
                            updateDraft(item.id, { reviewNotes: event.target.value })
                          }
                          placeholder="Add internal review notes or onboarding comments..."
                        />
                      </LockedField>
                    </div>

                    {!verificationCompleted && !clientRequest ? (
                      <div className="accessBlockedNote">
                        Onboarding remains blocked until identity, license, compliance, and
                        background checks are complete.
                      </div>
                    ) : null}

                    <div className="verificationSummary muted">
                      {verificationCompleted
                        ? 'Verification complete. This request is ready to unlock onboarding.'
                        : 'Complete all four verification checks before operational release.'}
                    </div>

                    <div className="verificationActions">
                      <Button
                        variant="secondary"
                        type="button"
                        disabled={busyId === item.id || !canReview}
                        onClick={() => saveVerification(item)}
                        title={!canReview ? 'You can view this request, but only reviewers can save verification changes.' : undefined}
                      >
                        Save Verification
                      </Button>
                      <ProtectedAction
                        permission={PERMISSIONS.ACCESS_REQUESTS_VERIFY}
                        variant="success"
                        deniedReason="You do not have verification authority to unlock onboarding."
                        onClick={() => decide(item, 'approved')}
                      >
                        Approve & unlock onboarding
                      </ProtectedAction>
                      <ProtectedAction
                        permission={PERMISSIONS.ACCESS_REQUESTS_REVIEW}
                        variant="danger"
                        deniedReason="You do not have review authority to reject access requests."
                        onClick={() => decide(item, 'rejected')}
                      >
                        Reject request
                      </ProtectedAction>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
