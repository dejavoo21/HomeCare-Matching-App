import {
  normalizeAdminFollowUpScheduled,
  normalizeFollowUpRequired,
  normalizeProfessionalId,
  normalizeRequestStatus,
} from '../../shared/schema/normalize';

export function mapRequest(raw: any) {
  const status = normalizeRequestStatus(raw?.status);
  const professionalId = normalizeProfessionalId(raw);
  const followUpRequired = normalizeFollowUpRequired(raw);
  const adminFollowUpScheduled = normalizeAdminFollowUpScheduled(raw);

  return {
    id: raw?.id,
    title: raw?.title ?? raw?.service_type ?? raw?.serviceType ?? 'Untitled request',
    status,
    professionalId,
    assignedProfessionalId: professionalId,
    patientName: raw?.patient_name ?? raw?.patientName ?? null,
    clientId: raw?.client_id ?? raw?.clientId ?? null,
    serviceType: raw?.service_type ?? raw?.serviceType ?? null,
    address: raw?.address_text ?? raw?.address ?? null,
    scheduledAt: raw?.scheduled_at ?? raw?.scheduledDateTime ?? raw?.preferred_start ?? null,
    scheduledDateTime: raw?.scheduledDateTime ?? raw?.scheduled_at ?? raw?.preferred_start ?? null,
    urgency: raw?.urgency ?? null,
    offerExpiresAt: raw?.offer_expires_at ?? raw?.offerExpiresAt ?? null,
    followUpRequired,
    follow_up_required: followUpRequired,
    adminFollowUpScheduled,
    admin_follow_up_scheduled: adminFollowUpScheduled,
    createdAt: raw?.created_at ?? raw?.createdAt ?? null,
    updatedAt: raw?.updated_at ?? raw?.updatedAt ?? null,
    raw,
  };
}

export function mapRequestList(items: any[] = []) {
  return items.map(mapRequest);
}
