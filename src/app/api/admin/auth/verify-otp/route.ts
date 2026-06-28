/**
 * POST /api/admin/auth/verify-otp
 *
 * Admin SMS-OTP verify (replaces the old TOTP-based verify-otp).
 * Thin adapter over `@/lib/domain/admin-auth/service`:
 *   - withRequest / withRateLimit envelope (`otp-verify` bucket).
 *   - parse() for input validation.
 *   - verifyAdminOtp() service call. The service throws
 *     UnauthorizedError("Invalid OTP") for every failure mode — the
 *     wrapper renders it as a 401.
 *   - On success: issue the admin JWT (purpose: "admin"), set the
 *     brpl_admin cookie, return the redirect target the UI requested.
 *
 * The `next` query/body param mirrors the user verify-otp flow: the UI
 * forwards its post-login destination, and we echo it back so the client
 * can hard-navigate after the cookie is committed.
 */

import "server-only";
import { z } from "zod";
import { withRequest, withRateLimit } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { parse } from "@/lib/api/parse";
import { limiterFor } from "@/lib/api/rate-limit";
import { signJwt, setAdminCookie } from "@/lib/jwt";
import { verifyAdminOtp } from "@/lib/domain/admin-auth/service";
import { MongooseAdminRepo, MongooseOtpRepo } from "@/lib/infra/db/mongoose-repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    phone: z.string().min(10).max(20),
    otp: z.string().regex(/^\d{4}$/),
});

// Shared in-memory rate limiter. 10 verify attempts per 10 min per IP —
// matches the user-side verify route so the limits are symmetric.
const verifyLimiter = limiterFor("otp-verify");

export const POST = withRequest(
    withRateLimit(
        { capacity: 10, refillPerSec: 10 / 600 },
        verifyLimiter,
    )(async ({ req }) => {
        const body = parse(await req.json().catch(() => ({})), schema);

        const admin = await verifyAdminOtp({
            phone: body.phone,
            code: body.otp,
            adminRepo: new MongooseAdminRepo(),
            otpRepo: new MongooseOtpRepo(),
        });

        // `next` is a UI-side concept — read it from the request URL so
        // the client can navigate to wherever the user was headed after
        // login. Default to the dashboard.
        const nextParam = new URL(req.url).searchParams.get("next") || "/admin";

        const token = await signJwt({
            sub: admin._id.toString(),
            phone: admin.phone,
            role: admin.role,
            name: admin.name,
            purpose: "admin",
        });
        await setAdminCookie(token);

        return ok({
            success: true,
            redirect: nextParam,
            admin: {
                id: admin._id.toString(),
                phone: admin.phone,
                role: admin.role,
                name: admin.name,
            },
        });
    }),
);