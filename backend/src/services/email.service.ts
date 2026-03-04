// ============================================================================
// EMAIL SERVICE - NODEMAILER INTEGRATION
// ============================================================================

import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const senderEmail = process.env.SENDER_EMAIL || smtpUser;
const senderName = process.env.SENDER_NAME || 'Homecare Matching';

// Check if we're in mock mode (can't reach real SMTP server)
const isMockMode = process.env.EMAIL_MOCK_MODE === 'true';

let transporter: any = null;

if (!isMockMode && (!smtpUser || !smtpPass)) {
  console.warn('⚠️  Email service not configured. OTP emails will be logged to console.');
  console.warn('    Set SMTP_USER and SMTP_PASS in .env to enable real email notifications.');
  console.warn('    Or set EMAIL_MOCK_MODE=true to use mock mode.\n');
}

// Only create real transporter if not in mock mode
if (!isMockMode && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // use TLS for 587, SSL for 465
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certs in dev
    },
  });
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  /**
   * Send any email
   */
  async send(payload: EmailPayload): Promise<void> {
    if (isMockMode) {
      console.log(`📧 [MOCK EMAIL] To: ${payload.to}`);
      console.log(`   Subject: ${payload.subject}`);
      console.log(`   HTML: ${payload.html.substring(0, 100)}...`);
      return; // Success in mock mode
    }

    if (!transporter || !smtpUser || !smtpPass) {
      console.warn(`📧 [EMAIL NOT SENT] To: ${payload.to}, Subject: ${payload.subject}`);
      console.warn(`    Configure SMTP_USER and SMTP_PASS in .env to send emails.`);
      console.warn(`    Or set EMAIL_MOCK_MODE=true to use mock mode.`);
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: `${senderName} <${senderEmail}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      console.log(`✅ Email sent. Message ID: ${info.messageId}`);
    } catch (err) {
      console.error('❌ Failed to send email:', err);
      throw err;
    }
  },

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(to: string, otp: string, expiryMinutes: number = 10): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; background: white; margin: 0 auto; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #333; margin: 0 0 10px 0; }
            .header p { color: #666; margin: 0; }
            .content { margin: 20px 0; }
            .otp-box { background: #f0f7ff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; font-family: monospace; }
            .expiry { color: #dc3545; font-size: 14px; margin-top: 10px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin: 20px 0; font-size: 13px; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Email Verification</h1>
              <p>Secure Login Verification Code</p>
            </div>

            <div class="content">
              <p>Hello,</p>
              <p>Your email verification code is:</p>

              <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <div class="expiry">⏱️ Expires in ${expiryMinutes} minutes</div>
              </div>

              <div class="warning">
                🔒 Never share this code with anyone. Our team will never ask for your verification code.
              </div>

              <p>If you didn't request this code, please ignore this email or contact our support team.</p>
            </div>

            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Homecare Matching. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `Your email verification code is: ${otp}\n\nExpires in ${expiryMinutes} minutes.\n\nDo not share this code with anyone.`;

    await this.send({
      to,
      subject: `🔐 Your Verification Code: ${otp}`,
      html,
      text,
    });
  },

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; background: white; margin: 0 auto; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #28a745; margin: 0 0 10px 0; }
            .content { margin: 20px 0; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; border-radius: 4px; text-decoration: none; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Welcome to Homecare Matching!</h1>
            </div>

            <div class="content">
              <p>Hi ${name},</p>
              <p>Your account has been successfully created and verified. You can now log in and start using our platform.</p>
              <a href="https://homecare-matching.example.com/login" class="button">Go to Dashboard</a>
              <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>

            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Homecare Matching. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.send({
      to,
      subject: `Welcome to Homecare Matching, ${name}!`,
      html,
    });
  },
};
