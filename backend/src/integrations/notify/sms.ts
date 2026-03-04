// ============================================================================
// SMS INTEGRATION
// ============================================================================
// Stub implementation - can be replaced with real SMS provider

const smsTemplates: Record<string, (payload: any) => string> = {
  offer_created: (payload) => `
    Homecare: New offer! ${payload.serviceType} at ${payload.address}.
    Expires: ${payload.offerExpiresAt}
  `,
  offer_accepted: (payload) => `
    Homecare: Your offer was accepted. Visit scheduled for ${payload.visitStart}
  `,
  visit_completed: (payload) => `
    Homecare: Visit completed. Thank you!
  `,
};

export async function sendSms(
  to: string,
  template: string,
  payload: any
): Promise<boolean> {
  try {
    const templateFn = smsTemplates[template];
    if (!templateFn) {
      console.warn(`⚠️  Unknown SMS template: ${template}`);
      return false;
    }

    const body = templateFn(payload);

    // STUB: Log instead of sending
    console.log(`📱 SMS to ${to}:\n${body}\n---`);

    // In production, replace with:
    // await twilio.messages.create({ to, body });

    return true;
  } catch (err) {
    console.error('SMS send error:', err);
    return false;
  }
}
