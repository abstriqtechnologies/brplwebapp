import { httpFetch } from "@/lib/api/http-client";
import { env } from "@/lib/env";

/**
 * Send OTP via SMSIndiaHub.
 * Env: SMS_API_KEY, SMS_SENDER_ID (default "SMSHUB"), SMS_GWID (default "2")
 */
export async function sendSmsOtp(mobile: string, otp: string, otpPurpose: string = "registration"): Promise<boolean> {
    // Normalize to 10-digit Indian mobile
    let formatted = mobile.replace(/\D/g, "");
    if (formatted.length === 12 && formatted.startsWith("91")) formatted = formatted.slice(2);
    if (formatted.length === 11 && formatted.startsWith("0")) formatted = formatted.slice(1);
    if (formatted.length !== 10) {
        // eslint-disable-next-line no-console
        console.error(`[SMS] Invalid mobile length: ${mobile}`);
        return false;
    }
    const withCountryCode = "91" + formatted;

    const apiKey = env.SMS_API_KEY;
    if (!apiKey) {
        // eslint-disable-next-line no-console
        console.error("[SMS] SMS_API_KEY not set — logging OTP to console instead");
        // eslint-disable-next-line no-console
        console.log(`\n========== DEV OTP ==========`);
        // eslint-disable-next-line no-console
        console.log(`Phone: ${withCountryCode}`);
        // eslint-disable-next-line no-console
        console.log(`OTP:   ${otp}`);
        // eslint-disable-next-line no-console
        console.log(`==============================\n`);
        return true;
    }

    const senderId = env.SMS_SENDER_ID;
    const gwid = env.SMS_GWID;
    const message = `Welcome to the Beyond Reach Premiere League powered by SMSINDIAHUB. Your OTP for ${otpPurpose} is ${otp}`;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://cloud.smsindiahub.in/vendorsms/pushsms.aspx?APIKey=${apiKey}&msisdn=${withCountryCode}&sid=${senderId}&msg=${encodedMessage}&fl=0&dc=0&gwid=${gwid}`;

    try {
        // The endpoint returns a string body (not JSON); httpFetch will
        // hand it back as text since the SMS gateway doesn't set JSON
        // content-type.
        await httpFetch<string>(url, {
            timeoutMs: 10_000,
            maxRetries: 2,
            consecutiveFailures: 3, // SMSIndiaHub occasionally 503s
        });
        // eslint-disable-next-line no-console
        console.log(`[SMS] OTP sent to ${withCountryCode}`);
        return true;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[SMS] Error sending OTP:", (err as Error).message ?? err);
        return false;
    }
}
