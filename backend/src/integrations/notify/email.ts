// ============================================================================
// EMAIL INTEGRATION
// ============================================================================
// Stub implementation - can be replaced with real mailer

const emailTemplates: Record<string, (payload: any) => string> = {
  offer_created: (payload) => `
    New care offer!
    
    Service: ${payload.serviceType}
    Location: ${payload.address}
    Requested: ${payload.preferredStart}
    Match Score: ${payload.score.toFixed(1)}%
    
    Please respond before: ${payload.offerExpiresAt}
  `,
  offer_accepted: (payload) => `
    Your offer has been accepted!
    
    Request: ${payload.requestId}
    Visit Time: ${payload.visitStart} - ${payload.visitEnd}
  `,
  visit_completed: (payload) => `
    Visit marked complete!
    
    Visit ID: ${payload.visitId}
    Completed at: ${payload.completedAt}
  `,
};

export async function sendEmail(
  to: string,
  template: string,
  payload: any
): Promise<boolean> {
  try {
    const templateFn = emailTemplates[template];
    if (!templateFn) {
      console.warn(`⚠️  Unknown email template: ${template}`);
      return false;
    }

    const body = templateFn(payload);

    // STUB: Log instead of sending
    console.log(`📧 Email to ${to}:\n${body}\n---`);

    // In production, replace with:
    // await nodemailer.transporter.sendMail({ to, subject: template, text: body });

    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}
