/**
 * Server-side Email Dispatch Service for Aura
 * Supports Resend, SendGrid, and SMTP without native binary dependencies.
 */

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}

/**
 * Send 6-digit OTP to an email address with modern branded Aura HTML template.
 */
export async function sendEmailOtp(email: string, otp: string): Promise<SendEmailResult> {
  const cleanEmail = email.toLowerCase().trim();
  const subject = `Aura verification code: ${otp}`;
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 20px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .logo { width: 44px; height: 44px; background: linear-gradient(135deg, #00B7FF, #6366F1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; color: #fff; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 8px; }
    .subtitle { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
    .otp-box { background: #0f172a; border: 1px solid #00B7FF; border-radius: 14px; padding: 18px; text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #00B7FF; font-family: monospace; margin-bottom: 24px; }
    .footer { font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align: center; margin-bottom: 16px;">
      <div style="display: inline-block; width: 44px; height: 44px; background: #00B7FF; border-radius: 12px; line-height: 44px; font-size: 24px; font-weight: bold; color: #000;">a</div>
    </div>
    <div class="title" style="text-align: center;">Aura Verification Code</div>
    <div class="subtitle" style="text-align: center;">Use the code below to complete your sign-in to Aura. This code is valid for 5 minutes.</div>
    <div class="otp-box">${otp}</div>
    <div style="font-size: 12px; color: #94a3b8; text-align: center;">
      If you did not request this verification code, you can safely ignore this email.
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Aura Social Network. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  // 1. Check Resend (Primary Recommendation for Vercel/Next.js)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || "Aura <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [cleanEmail],
          subject: subject,
          html: htmlContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("[Email: Resend Error]", data);
        return {
          success: false,
          error: data.message || "Failed to send email through Resend.",
        };
      }

      return {
        success: true,
        messageId: data.id,
        provider: "resend",
      };
    } catch (err: any) {
      console.error("[Email: Resend Exception]", err);
      return {
        success: false,
        error: err.message || "Resend connection failed.",
      };
    }
  }

  // 2. Check SendGrid
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    try {
      const fromEmail = process.env.SENDGRID_FROM || process.env.EMAIL_FROM || "noreply@aura.app";
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: cleanEmail }] }],
          from: { email: fromEmail, name: "Aura Social" },
          subject: subject,
          content: [{ type: "text/html", value: htmlContent }],
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[Email: SendGrid Error]", errorText);
        return {
          success: false,
          error: "Failed to send email via SendGrid.",
        };
      }

      return {
        success: true,
        provider: "sendgrid",
      };
    } catch (err: any) {
      console.error("[Email: SendGrid Exception]", err);
      return {
        success: false,
        error: err.message || "SendGrid connection error.",
      };
    }
  }

  // 3. No Email Provider configured
  return {
    success: false,
    error: "Email provider is not configured. Please add RESEND_API_KEY in your environment variables.",
  };
}
