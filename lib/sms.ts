/**
 * Server-side SMS Dispatch Service for Aura
 * Supports Twilio, MSG91, and Fast2SMS without requiring heavy native SDKs.
 */

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}

/**
 * Send 6-digit OTP to a mobile phone number via real configured SMS provider.
 */
export async function sendSmsOtp(mobileNumber: string, otp: string): Promise<SendSmsResult> {
  const formattedNumber = mobileNumber.startsWith("+") ? mobileNumber : `+${mobileNumber}`;
  const messageText = `Your Aura verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;

  // 1. Check Twilio Configuration
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (twilioSid && twilioAuthToken && twilioFrom) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const basicAuth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString("base64");

      const params = new URLSearchParams();
      params.append("To", formattedNumber);
      if (twilioFrom.startsWith("MG")) {
        params.append("MessagingServiceSid", twilioFrom);
      } else {
        params.append("From", twilioFrom);
      }
      params.append("Body", messageText);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("[SMS: Twilio Error]", data);
        return {
          success: false,
          error: data.message || "Failed to deliver SMS via Twilio.",
        };
      }

      return {
        success: true,
        messageId: data.sid,
        provider: "twilio",
      };
    } catch (err: any) {
      console.error("[SMS: Twilio Exception]", err);
      return {
        success: false,
        error: err.message || "Twilio network connection failed.",
      };
    }
  }

  // 2. Check MSG91 Configuration (Preferred in India)
  const msg91AuthKey = process.env.MSG91_AUTH_KEY;
  const msg91TemplateId = process.env.MSG91_TEMPLATE_ID;

  if (msg91AuthKey) {
    try {
      // MSG91 OTP API: https://control.msg91.com/api/v5/otp
      const cleanPhone = formattedNumber.replace(/\+/g, "");
      let endpoint = `https://control.msg91.com/api/v5/otp?authkey=${encodeURIComponent(msg91AuthKey)}&mobile=${encodeURIComponent(cleanPhone)}&otp=${encodeURIComponent(otp)}`;
      if (msg91TemplateId) {
        endpoint += `&template_id=${encodeURIComponent(msg91TemplateId)}`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok || data.type === "error") {
        console.error("[SMS: MSG91 Error]", data);
        return {
          success: false,
          error: data.message || "Failed to deliver SMS via MSG91.",
        };
      }

      return {
        success: true,
        messageId: data.request_id || "msg91_sent",
        provider: "msg91",
      };
    } catch (err: any) {
      console.error("[SMS: MSG91 Exception]", err);
      return {
        success: false,
        error: err.message || "MSG91 network connection failed.",
      };
    }
  }

  // 3. Check Fast2SMS Configuration
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  if (fast2smsKey) {
    try {
      // Fast2SMS accepts 10-digit Indian numbers
      const digitsOnly = formattedNumber.replace(/\D/g, "");
      const tenDigit = digitsOnly.slice(-10);

      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: tenDigit,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.return) {
        console.error("[SMS: Fast2SMS Error]", data);
        return {
          success: false,
          error: data.message || "Failed to deliver SMS via Fast2SMS.",
        };
      }

      return {
        success: true,
        messageId: data.request_id,
        provider: "fast2sms",
      };
    } catch (err: any) {
      console.error("[SMS: Fast2SMS Exception]", err);
      return {
        success: false,
        error: err.message || "Fast2SMS connection error.",
      };
    }
  }

  // 4. No provider configured
  return {
    success: false,
    error: "SMS provider is not configured. Please configure TWILIO_ACCOUNT_SID, MSG91_AUTH_KEY, or FAST2SMS_API_KEY in your environment variables.",
  };
}
