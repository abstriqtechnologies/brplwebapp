/**
 * POST /api/admin/auth/send-otp
 *
 * Admin SMS-OTP send. Thin adapter over `@/lib/domain/admin-auth/service`:
 *   - withRequest / withRateLimit envelope (same otp-send bucket as the
 *     user route — abuse on either surface throttles both).
 *   - parse() for input validation.
 *   - sendAdminOtp() service call.
 *   - Always returns `{ success: true, message: "OTP sent", expiresInSec }`
 *     with `expiresInSec = 0` for non-allowlist phones so the response is
 *     indistinguishable from the success path (prevents allowlist
 *     enumeration).
 *
 * ensureDefaultAdmin() is invoked at the top of the handler so a fresh
 * env has an admin doc before the first send — the bootstrap stamps the
 * phone from ADMIN_PHONES, which verifyAdminOtp needs to find the admin.
 */

import "server-only";
import { z } from "zod";
import { withRequest, withRateLimit } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { parse } from "@/lib/api/parse";
import { limiterFor } from "@/lib/api/rate-limit";
import { sendSmsOtp } from "@/lib/sms";
import { generateOtp } from "@/lib/phone";
import { sendAdminOtp } from "@/lib/domain/admin-auth/service";
import { MongooseOtpRepo } from "@/lib/infra/db/mongoose-repos";
import { ensureDefaultAdmin } from "@/lib/adminBootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    phone: z.string().min(10).max(20),
});

// Shared in-memory rate limiter (process-local). Same bucket as the user
// send-otp route — 5 requests per 10 min per IP.
const otpLimiter = limiterFor("otp-send");

export const POST = withRequest(
    withRateLimit(
        { capacity: 5, refillPerSec: 5 / 600 },
        otpLimiter,
    )(async ({ req }) => {
        // Idempotent — no-op after the first run in this process.
        await ensureDefaultAdmin();

        const body = parse(await req.json().catch(() => ({})), schema);

        const result = await sendAdminOtp({
            phone: body.phone,
            otpRepo: new MongooseOtpRepo(),
            generateOtp,
            sendSms: sendSmsOtp,
        });

        return ok({
            success: true,
            message: "OTP sent",
            expiresInSec: result.expiresInSec,
        });
    }),
);