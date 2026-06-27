/**
 * Admin auth service — pure business logic over AdminRepo + OtpRepo.
 *
 * Mirrors `src/lib/domain/auth/service.ts` for the user flow: no Mongoose,
 * no NextResponse, dependencies injected for tests. The route handler
 * parses input, calls the service, and wraps the result with the standard
 * `ok()` / error envelope.
 *
 * Public surface:
 *   - `getAdminAllowedPhones()` / `isAdminAllowedPhone()` — env allowlist
 *     helpers used by `sendAdminOtp` to silently drop disallowed numbers.
 *   - `sendAdminOtp()` — generates a 4-digit OTP, persists it, and sends
 *     via the injected `sendSms`. Returns `{ sent: false }` for
 *     non-allowlist phones (no OtpRecord, no SMS — prevents enumeration).
 *   - `verifyAdminOtp()` — generic "Invalid OTP" for every failure mode
 *     (no record, already used, expired, code mismatch, unknown phone,
 *     inactive admin). On success returns the AdminUser.
 *
 * The resend cooldown and OTP TTL mirror the user flow so an attacker
 * can't bypass the cooldown by switching between user and admin senders.
 */

import "server-only";
import { RateLimitError, UnauthorizedError, UpstreamError } from "@/lib/api/errors";
import { normalizePhone } from "@/lib/phone";
import { env } from "@/lib/env";
import type { IAdminUser } from "@/models/AdminUser";
import type { AdminRepo, OtpRepo } from "@/lib/infra/db/repos";

// Same constants as the user flow — keeping them aligned means an attacker
// can't bypass the 60s cooldown by hammering the admin endpoint instead.
const RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_TTL_SEC = OTP_TTL_MS / 1000;

/** Fallback used when ADMIN_PHONES is unset or empty. */
const DEFAULT_ADMIN_PHONE = "9234894293";

// ---------- Allowlist helpers ----------

/**
 * Parse `ADMIN_PHONES` into a normalized list of 10-digit Indian mobiles.
 *
 * The zod default only fires when the env var is `undefined` — if it's
 * set to "" in production, the parsed value is "" and `split(",")` would
 * produce an empty array, locking every admin out. We treat an empty
 * (or whitespace-only) value as the default to keep that from happening.
 */
export function getAdminAllowedPhones(): string[] {
    const raw = (env.ADMIN_PHONES ?? "").trim();
    if (!raw) return [DEFAULT_ADMIN_PHONE];

    const out: string[] = [];
    const seen = new Set<string>();
    for (const piece of raw.split(",")) {
        const norm = normalizePhone(piece);
        if (!norm || seen.has(norm)) continue;
        seen.add(norm);
        out.push(norm);
    }
    return out.length > 0 ? out : [DEFAULT_ADMIN_PHONE];
}

export function isAdminAllowedPhone(phone10: string): boolean {
    return getAdminAllowedPhones().includes(phone10);
}

// ---------- sendAdminOtp ----------

export type SendAdminOtpDeps = {
    phone: string;
    otpRepo: OtpRepo;
    generateOtp: () => string;
    sendSms: (phone: string, otp: string, purpose: string) => Promise<boolean>;
    now?: () => number;
};

export type SendAdminOtpResult = { sent: boolean; expiresInSec: number };

/**
 * Send an admin OTP. Non-allowlist phones are silently rejected
 * (`{ sent: false }`) so the response is indistinguishable from the
 * success path — prevents allowlist enumeration.
 */
export async function sendAdminOtp(deps: SendAdminOtpDeps): Promise<SendAdminOtpResult> {
    const phone = normalizePhone(deps.phone);
    if (!phone) {
        // Same shape as the non-allowlist branch — don't leak whether the
        // phone is well-formed vs. just not on the list.
        return { sent: false, expiresInSec: 0 };
    }

    if (!isAdminAllowedPhone(phone)) {
        return { sent: false, expiresInSec: 0 };
    }

    const now = (deps.now ?? Date.now)();

    // Resend cooldown — same 60s window as the user flow.
    const recent = await deps.otpRepo.findLatest(phone);
    if (recent && recent.expiresAt.getTime() > now) {
        const ageMs = now - (recent.createdAt?.getTime() ?? now);
        if (ageMs < RESEND_COOLDOWN_MS) {
            const waitSec = Math.ceil((RESEND_COOLDOWN_MS - ageMs) / 1000);
            throw new RateLimitError(waitSec, `Please wait ${waitSec}s before requesting a new OTP`);
        }
    }

    const otp = deps.generateOtp();
    const expiresAt = new Date(now + OTP_TTL_MS);
    await deps.otpRepo.create({ phone, otp, expiresAt });

    const sent = await deps.sendSms(phone, otp, "admin");
    if (!sent) {
        throw new UpstreamError("Failed to send OTP");
    }
    return { sent: true, expiresInSec: OTP_TTL_SEC };
}

// ---------- verifyAdminOtp ----------

export type VerifyAdminOtpDeps = {
    phone: string;
    code: string;
    adminRepo: AdminRepo;
    otpRepo: OtpRepo;
    findLatestOtp?: OtpRepo["findLatest"]; // optional override for tests
    now?: () => number;
};

/**
 * Verify a 4-digit admin OTP. Every failure path collapses to a single
 * `UnauthorizedError("Invalid OTP")` — the allowlist gate at send-time
 * already kept non-admins out of the OTP loop, so this branch only really
 * fires when an admin is deleted between send and verify.
 */
export async function verifyAdminOtp(deps: VerifyAdminOtpDeps): Promise<IAdminUser> {
    const phone = normalizePhone(deps.phone);
    if (!phone) throw new UnauthorizedError("Invalid OTP");
    if (!/^\d{4}$/.test(deps.code)) throw new UnauthorizedError("Invalid OTP");

    const now = (deps.now ?? Date.now)();
    const find = deps.findLatestOtp ?? ((p: string) => deps.otpRepo.findLatest(p));
    const otp = await find(phone);
    if (!otp) throw new UnauthorizedError("Invalid OTP");
    if (otp.verified) throw new UnauthorizedError("Invalid OTP");
    if (otp.expiresAt.getTime() < now) throw new UnauthorizedError("Invalid OTP");
    if (otp.otp !== deps.code) throw new UnauthorizedError("Invalid OTP");

    const admin = await deps.adminRepo.findByPhone(phone);
    if (!admin || admin.active === false) {
        throw new UnauthorizedError("Invalid OTP");
    }
    return admin;
}