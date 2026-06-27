/**
 * Auth service — pure business logic over UserRepo + OtpRepo.
 *
 * No Mongoose, no NextResponse, no `req.json()` parsing here. The route
 * handler:
 *   1. Parses the request body (via `parse()`).
 *   2. Calls the service.
 *   3. Wraps the service's return value in `ok()` for a 2xx, or lets an
 *      AppError propagate to `withRequest()` for a typed error response.
 *
 * The service depends ONLY on the repo interfaces — production wires in
 * the Mongoose-backed repos; tests use the in-memory fakes.
 */

import "server-only";
import { BadRequestError, ConflictError, NotFoundError, RateLimitError, UnauthorizedError } from "@/lib/api/errors";
import type { IUser } from "@/models/User";
import type { IOtpRecord } from "@/models/OtpRecord";
import type { UserRepo, OtpRepo } from "@/lib/infra/db/repos";

const RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;

const USER_ROLES = ["batsman", "bowler", "allrounder", "wicketkeeper"] as const;

// ---------- Phone helpers ----------

/** Strip country code, leading 0, and any non-digits. Returns last 10 digits. */
function normalizePhone(raw: string): string | null {
    let s = raw.replace(/\D/g, "");
    if (s.length === 12 && s.startsWith("91")) s = s.slice(2);
    if (s.length === 11 && s.startsWith("0")) s = s.slice(1);
    return s.length === 10 ? s : null;
}

// ---------- sendOtp ----------

export type SendOtpDeps = {
    phone: string;
    userRepo: UserRepo;
    otpRepo: OtpRepo;
    generateOtp: () => string;
    sendSms: (phone: string, otp: string, purpose: string) => Promise<boolean>;
    now?: () => number;
};

export type SendOtpResult = { expiresInSec: number };

export async function sendOtp(deps: SendOtpDeps): Promise<SendOtpResult> {
    const phone = normalizePhone(deps.phone);
    if (!phone) {
        throw new BadRequestError("Invalid phone number");
    }

    const now = (deps.now ?? Date.now)();

    // Rate-limit: don't allow resend within cooldown.
    const recent = await deps.otpRepo.findLatest(phone);
    if (recent && recent.expiresAt.getTime() > now) {
        // "expiresAt > now" means the OTP hasn't expired yet.
        const ageMs = now - (recent.createdAt?.getTime() ?? now);
        if (ageMs < RESEND_COOLDOWN_MS) {
            const waitSec = Math.ceil((RESEND_COOLDOWN_MS - ageMs) / 1000);
            throw new RateLimitError(waitSec, `Please wait ${waitSec}s before requesting a new OTP`);
        }
    }

    const otp = deps.generateOtp();
    const expiresAt = new Date(now + OTP_TTL_MS);
    await deps.otpRepo.create({ phone, otp, expiresAt });

    const sent = await deps.sendSms(phone, otp, "registration");
    if (!sent) {
        // Don't leak SMS internals — bubble up a generic 502.
        const { UpstreamError } = await import("@/lib/api/errors");
        throw new UpstreamError("Failed to send OTP");
    }
    return { expiresInSec: OTP_TTL_MS / 1000 };
}

// ---------- verifyOtp ----------

export type VerifyOtpDeps = {
    phone: string;
    code: string;
    userRepo: UserRepo;
    otpRepo: OtpRepo;
    findLatestOtp?: OtpRepo["findLatest"]; // optional override for tests
    now?: () => number;
};

export type VerifyOtpResult = { kind: "existing"; user: IUser; paid: boolean } | { kind: "new"; phone: string };

export async function verifyOtp(deps: VerifyOtpDeps): Promise<VerifyOtpResult> {
    const phone = normalizePhone(deps.phone);
    if (!phone) throw new BadRequestError("Invalid phone number");
    if (!/^\d{4}$/.test(deps.code)) {
        throw new UnauthorizedError("Invalid OTP");
    }

    const now = (deps.now ?? Date.now)();
    const find = deps.findLatestOtp ?? ((p: string) => deps.otpRepo.findLatest(p));
    const otp = await find(phone);
    if (!otp) throw new UnauthorizedError("No OTP requested for this phone");
    if (otp.verified) throw new UnauthorizedError("OTP already used");
    if (otp.expiresAt.getTime() < now) throw new UnauthorizedError("OTP expired");
    if (otp.otp !== deps.code) throw new UnauthorizedError("Incorrect OTP");

    const existing = await deps.userRepo.findByPhone(phone);
    if (existing) {
        return {
            kind: "existing",
            user: existing,
            paid: existing.paymentStatus === "completed",
        };
    }
    return { kind: "new", phone };
}

// ---------- registerUser ----------

export type RegisterUserInput = {
    phone: string;
    /**
     * Optional. When present (auth-cookie path), the User record already
     * exists — registerUser will look it up by phone and enrich it. The
     * field is accepted here purely so callers that have a userId don't
     * need to discard it; lookup is still keyed on phone to keep the
     * service's contract phone-keyed (and to match pending-cookie callers
     * that only have phone).
     */
    userId?: string;
    name: string;
    email: string;
    role: (typeof USER_ROLES)[number];
    state: string;
    city: string;
    /**
     * Optional. The webhook-first race (server marks paid before the
     * Razorpay modal handler runs) means the client sometimes lacks the
     * paymentId/orderId. When missing, registerUser falls back to the
     * values already stamped on the existing User record (if any).
     */
    paymentId?: string;
    orderId?: string;
};

export type RegisterUserDeps = {
    userRepo: UserRepo;
};

export async function registerUser(input: RegisterUserInput, deps: RegisterUserDeps): Promise<IUser> {
    if (!input.name?.trim()) throw new BadRequestError("Name is required");
    if (!input.email?.trim() || !input.email.includes("@")) {
        throw new BadRequestError("Valid email is required");
    }
    if (!USER_ROLES.includes(input.role)) {
        throw new BadRequestError("Invalid role");
    }
    if (!input.state?.trim()) throw new BadRequestError("State is required");
    if (!input.city?.trim()) throw new BadRequestError("City is required");

    const phone = normalizePhone(input.phone);
    if (!phone) throw new BadRequestError("Invalid phone number");

    const existing = await deps.userRepo.findByPhone(phone);

    // "Already registered" guard: only block when the existing record is fully
    // completed. A pending record (profile saved, payment not yet captured)
    // can be safely upgraded when payment arrives.
    if (existing?.name && existing.paymentStatus === "completed") {
        // Already completed. If the caller is the polling path that fires
        // finishRegistration with no payment identifiers (webhook-first
        // race), don't downgrade the record. Return the existing user
        // as-is instead of writing pending back over completed.
        if (!input.paymentId?.trim() || !input.orderId?.trim()) {
            return existing;
        }
        throw new ConflictError("User already registered for this phone");
    }

    const hasPayment = Boolean(input.paymentId?.trim() && input.orderId?.trim());

    // Build the profile payload. paymentStatus depends on whether we have
    // payment identifiers. When unpaid, we deliberately omit paymentId/orderId/
    // amount so the User record reflects "tried to sign up, hasn't paid".
    const profile: Record<string, unknown> = {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        state: input.state.trim(),
        city: input.city.trim(),
        paymentStatus: hasPayment ? "completed" : "pending",
    };

    if (hasPayment) {
        // Resolve paymentId/orderId from the client, falling back to whatever
        // is already on the User record. The webhook-first race means the
        // client sometimes doesn't have them.
        const paymentId = input.paymentId!.trim();
        const orderId = input.orderId!.trim();
        profile.paymentId = paymentId || existing?.paymentId;
        profile.orderId = orderId || existing?.orderId;
        profile.amount = 1499;
    }

    if (existing) {
        const updated = await deps.userRepo.update(String(existing._id), profile);
        if (!updated) throw new NotFoundError("User record disappeared mid-registration");
        return updated;
    }

    const created = await deps.userRepo.create({
        phone,
        ...profile,
    } as any);

    return created;
}
