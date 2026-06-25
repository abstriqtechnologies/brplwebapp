/**
 * Admin password policy.
 *
 * Rules:
 *   - ≥ 12 characters.
 *   - At least one lowercase, one uppercase, one digit.
 *   - Not in the small list of well-known breached passwords.
 *
 * Returns `null` if the password is valid; otherwise returns a human-readable
 * reason. Callers can convert to a typed `BadRequestError` with the message.
 *
 * This is deliberately NOT backed by HIBP — it would add an external
 * dependency for a check that happens rarely (only on password change /
 * admin setup). Phase 5+ may integrate HIBP if needed.
 */

const MIN_LENGTH = 12;

// A small list of the most-commonly-leaked passwords. Intentionally tiny —
// anything larger belongs in HIBP. The list is checked case-insensitively.
const BANNED_PASSWORDS = new Set([
    "password",
    "qwerty",
    "letmein",
    "welcome",
    "admin",
    "administrator",
    "iloveyou",
    "monkey",
    "dragon",
    "111111",
    "123456",
    "1234567890",
]);

export type PasswordPolicyError = "TOO_SHORT" | "NO_LOWERCASE" | "NO_UPPERCASE" | "NO_DIGIT" | "BANNED";

export function validatePassword(pwd: string): string | null {
    if (!pwd || pwd.length < MIN_LENGTH) {
        return `Password must be at least ${MIN_LENGTH} characters long`;
    }
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one digit";
    const lower = pwd.toLowerCase();
    for (const banned of BANNED_PASSWORDS) {
        if (lower.includes(banned)) {
            return "This password is too common — please choose a different one";
        }
    }
    return null;
}
