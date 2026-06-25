/**
 * POST /api/auth/send-otp
 *
 * Phase 3.6: migrated to the new layered pattern. Auth/business logic now
 * lives in `@/lib/domain/auth/service`. This route is a thin adapter:
 *   - withRequest for request ID + error envelope.
 *   - withRateLimit (5 per 10 min per IP).
 *   - parse() for input validation.
 *   - sendOtp() service call.
 */

import { z } from "zod";
import { withRequest, withRateLimit } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { parse } from "@/lib/api/parse";
import { limiterFor } from "@/lib/api/rate-limit";
import { sendSmsOtp } from "@/lib/sms";
import { generateOtp } from "@/lib/phone";
import { sendOtp as sendOtpService } from "@/lib/domain/auth/service";
import { MongooseUserRepo, MongooseOtpRepo } from "@/lib/infra/db/mongoose-repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    phone: z.string().min(10).max(20),
});

// Shared in-memory rate limiter (process-local). 5 OTP requests per 10 min
// per IP — matches the original route's behaviour.
const otpLimiter = limiterFor("otp-send");

export const POST = withRequest(
    withRateLimit(
        { capacity: 5, refillPerSec: 5 / 600 },
        otpLimiter,
    )(async ({ req }) => {
        const body = parse(await req.json().catch(() => ({})), schema);

        const result = await sendOtpService({
            phone: body.phone,
            userRepo: new MongooseUserRepo(),
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
