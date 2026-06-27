/**
 * Normalize a phone number to 10-digit Indian mobile format.
 * Accepts: 9876543210, +919876543210, 919876543210, 09876543210
 * Returns: 9876543210 or null if invalid.
 */
export function normalizePhone(input: string): string | null {
    if (!input) return null;
    let digits = input.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length !== 10) return null;
    if (!/^[6-9]/.test(digits)) return null; // Indian mobile numbers start with 6-9
    return digits;
}

/**
 * Generate a cryptographically random 4-digit OTP.
 */
export function generateOtp(): string {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const n = buf[0] % 10_000;
    return n.toString().padStart(4, "0");
}
