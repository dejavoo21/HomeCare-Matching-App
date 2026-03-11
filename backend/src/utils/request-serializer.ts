import { normalizeProfessionalId, normalizeRequestStatus } from '../shared/schema/normalize';

export function serializeRequest(row: any) {
  const professionalId = normalizeProfessionalId(row);
  const followUpRequired = Boolean(row?.follow_up_required ?? row?.followUpRequired ?? false);
  const adminFollowUpScheduled = Boolean(
    row?.admin_follow_up_scheduled ?? row?.adminFollowUpScheduled ?? false
  );

  return {
    id: row?.id,
    clientId: row?.clientId ?? row?.client_id ?? null,
    serviceType: row?.serviceType ?? row?.service_type ?? null,
    address: row?.address ?? row?.address_text ?? null,
    scheduledDateTime:
      row?.scheduledDateTime ?? row?.scheduled_at ?? row?.preferred_start ?? null,
    urgency: row?.urgency ?? null,
    status: normalizeRequestStatus(row?.status),
    description: row?.description ?? '',
    professionalId,
    assignedProfessionalId: professionalId,
    offerExpiresAt: row?.offerExpiresAt ?? row?.offer_expires_at ?? null,
    followUpRequired,
    adminFollowUpScheduled,
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
  };
}
