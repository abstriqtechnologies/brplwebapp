import axios from "axios";

/**
 * Send OTP via SMSIndiaHub.
 * Env: SMS_API_KEY, SMS_SENDER_ID (default "SMSHUB"), SMS_GWID (default "2")
 */
export async function sendSmsOtp(mobile: string, otp: string, otpPurpose: string = "registration"): Promise<boolean> {
    try {
        // Normalize to 10-digit Indian mobile
        let formatted = mobile.replace(/\D/g, "");
        if (formatted.length === 12 && formatted.startsWith("91")) formatted = formatted.slice(2);
        if (formatted.length === 11 && formatted.startsWith("0")) formatted = formatted.slice(1);
        if (formatted.length !== 10) {
            console.error(`[SMS] Invalid mobile length: ${mobile}`);
            return false;
        }
        const withCountryCode = "91" + formatted;

        const apiKey = process.env.SMS_API_KEY;
        if (!apiKey) {
            console.error("[SMS] SMS_API_KEY not set — logging OTP to console instead");
            console.log(`\n========== DEV OTP ==========`);
            console.log(`Phone: ${withCountryCode}`);
            console.log(`OTP:   ${otp}`);
            console.log(`==============================\n`);
            return true;
        }

        const senderId = process.env.SMS_SENDER_ID || "SMSHUB";
        const gwid = process.env.SMS_GWID || "2";
        const message = `Welcome to the Beyond Reach Premiere League powered by SMSINDIAHUB. Your OTP for ${otpPurpose} is ${otp}`;
        const encodedMessage = encodeURIComponent(message);
        const url = `https://cloud.smsindiahub.in/vendorsms/pushsms.aspx?APIKey=${apiKey}&msisdn=${withCountryCode}&sid=${senderId}&msg=${encodedMessage}&fl=0&dc=0&gwid=${gwid}`;

        const response = await axios.get(url, { timeout: 10000 });
        console.log(`[SMS] OTP sent to ${withCountryCode}:`, response.data);
        return true;
    } catch (error: any) {
        console.error("[SMS] Error sending OTP:", error?.message || error);
        return false;
    }
}
