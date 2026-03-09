import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

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

export function AccessRequestsPanel({
  refreshKey,
  hideSummary = false,
}: {
  refreshKey?: number;
  hideSummary?: boolean;
}) {
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

  return (
    <div className="sideCard accessWorkflowCard" aria-label="Access requests">
      <div className="sideHeader">
        <div>
          <h3 className="sideTitle">Access Requests</h3>
          <p className="muted">
            Review identity, documents, and onboarding readiness before approval.
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
          <div className="empty">Loading access requests...</div>
        ) : items.length === 0 ? (
          <div className="premiumEmptyState premiumEmptyState-compact">
            <div className="premiumEmptyTitle">No access requests found</div>
            <div className="premiumEmptyText">
              New onboarding requests will appear here for review and verification.
            </div>
          </div>
        ) : (
          <div className="accessList">
            {items.map((item) => {
              const draft = drafts[item.id] || createDraft(item);
              const verificationCompleted =
                draft.identityVerified &&
                draft.licenseVerified &&
                draft.complianceVerified &&
                draft.backgroundCheckVerified;
              const canApprove =
                !busyId &&
                item.status !== 'approved' &&
                !draft.additionalInfoRequested &&
                (verificationCompleted ||
                  String(item.requested_role).toLowerCase() === 'client');

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
                      <span className={`pill pill-${item.status}`}>{item.status.toUpperCase()}</span>
                      {draft.additionalInfoRequested ? (
                        <span className="pill pill-warning">INFO REQUESTED</span>
                      ) : null}
                      {verificationCompleted ? (
                        <span className="pill pill-approved">VERIFIED</span>
                      ) : (
                        <span className="pill pill-info">VERIFICATION PENDING</span>
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
                    <span className={draft.identityVerified ? 'pill pill-approved' : 'pill pill-info'}>
                      Identity
                    </span>
                    <span className={draft.licenseVerified ? 'pill pill-approved' : 'pill pill-info'}>
                      License
                    </span>
                    <span
                      className={draft.complianceVerified ? 'pill pill-approved' : 'pill pill-info'}
                    >
                      Compliance
                    </span>
                    <span
                      className={
                        draft.backgroundCheckVerified ? 'pill pill-approved' : 'pill pill-info'
                      }
                    >
                      Background
                    </span>
                  </div>

                  <div className="verificationPanel">
                    <div className="verificationTitle">Verification</div>

                    <div className="documentationChecks">
                      <label className="checkRow">
                        <input
                          type="checkbox"
                          checked={draft.identityVerified}
                          onChange={(event) =>
                            updateDraft(item.id, { identityVerified: event.target.checked })
                          }
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
                        />
                        <span>Background check verified</span>
                      </label>
                    </div>

                    <div className="accessVerificationGrid">
                      <label className="checkRow">
                        <input
                          type="checkbox"
                          checked={draft.additionalInfoRequested}
                          onChange={(event) =>
                            updateDraft(item.id, { additionalInfoRequested: event.target.checked })
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

                      <textarea
                        className="input accessTextarea"
                        rows={3}
                        value={draft.reviewNotes}
                        onChange={(event) =>
                          updateDraft(item.id, { reviewNotes: event.target.value })
                        }
                        placeholder="Add internal review notes or onboarding comments..."
                      />
                    </div>

                    {!verificationCompleted &&
                    String(item.requested_role).toLowerCase() !== 'client' ? (
                      <div className="accessBlockedNote">
                        Onboarding remains blocked until identity, license, compliance, and
                        background checks are complete.
                      </div>
                    ) : null}

                    <div className="verificationSummary muted">
                      {verificationCompleted
                        ? 'Verification complete. This request can be approved.'
                        : 'Complete all four verification checks before approval.'}
                    </div>

                    <div className="verificationActions">
                      <button
                        className="btn"
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => saveVerification(item)}
                      >
                        Save Verification
                      </button>
                      <button
                        className={canApprove ? 'btn btn-primary' : 'btn btn-disabled'}
                        type="button"
                        disabled={
                          busyId === item.id ||
                          item.status === 'approved' ||
                          (!verificationCompleted &&
                            String(item.requested_role).toLowerCase() !== 'client') ||
                          draft.additionalInfoRequested
                        }
                        onClick={() => decide(item, 'approved')}
                      >
                        Verify & Unlock Onboarding
                      </button>
                      <button
                        className="btn btn-danger"
                        type="button"
                        disabled={busyId === item.id || item.status === 'rejected'}
                        onClick={() => decide(item, 'rejected')}
                      >
                        Reject
                      </button>
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
