/**
 * Pure helpers used by /auth page. Kept in a separate module
 * so they can be unit-tested without a DOM.
 */

export const PHONE_REGEX = /^\d{10}$/;

export function isValidPhone(phone: string): boolean {
    return PHONE_REGEX.test(phone);
}

export function isCompleteOtp(otp: ReadonlyArray<string>): boolean {
    return otp.length === 6 && otp.every((d) => d.length === 1 && /^\d$/.test(d));
}

export function formatOtpExpiry(expiresInSec: number): string {
    if (expiresInSec <= 0) return "0:00";
    const m = Math.floor(expiresInSec / 60);
    const s = expiresInSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export const REGISTRATION_FEE_DISPLAY = "₹1,499";