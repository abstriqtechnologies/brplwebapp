/**
 * POST /api/auth/verify-otp
 *
 * Phase 3.6: business logic in `@/lib/domain/auth/service`. The route is
 * a thin adapter that:
 *   - parses input,
 *   - calls the service,
 *   - issues the right cookie (full auth vs pending) based on the result.
 *
 * Note: response shape preserved for the existing client (`{ exists, redirect }`).
 */

import { z } from "zod";
import { withRequest, withRateLimit } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { parse } from "@/lib/api/parse";
import { limiterFor } from "@/lib/api/rate-limit";
import { verifyOtp as verifyOtpService } from "@/lib/domain/auth/service";
import { signAuth, signPending } from "@/lib/auth/crypto";
import { setAuthCookie, setPendingCookie } from "@/lib/auth/cookies";
import { MongooseUserRepo, MongooseOtpRepo } from "@/lib/infra/db/mongoose-repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    phone: z.string().min(10).max(20),
    otp: z.string().regex(/^\d{4}$/),
});

const verifyLimiter = limiterFor("otp-verify");

export const POST = withRequest(
    withRateLimit(
        { capacity: 10, refillPerSec: 10 / 600 },
        verifyLimiter,
    )(async ({ req }) => {
        const body = parse(await req.json().catch(() => ({})), schema);

        const result = await verifyOtpService({
            phone: body.phone,
            code: body.otp,
            userRepo: new MongooseUserRepo(),
            otpRepo: new MongooseOtpRepo(),
        });

        if (result.kind === "existing") {
            const paid = result.paid;
            const token = await signAuth({
                sub: result.user._id.toString(),
                phone: result.user.phone,
                paid,
            });
            await setAuthCookie(token);
            return ok({
                success: true,
                exists: true,
                paid,
                user: {
                    id: result.user._id.toString(),
                    phone: result.user.phone,
                    name: result.user.name,
                    role: result.user.role,
                    paymentStatus: result.user.paymentStatus,
                },
                redirect: paid ? "/dashboard" : "/checkout?next=/dashboard",
            });
        }

        // New user — issue short-lived pending cookie.
        const token = await signPending({
            sub: `pending:${result.phone}`,
            phone: result.phone,
        });
        await setPendingCookie(token);
        return ok({
            success: true,
            exists: false,
            paid: false,
            redirect: "/checkout?next=/dashboard",
        });
    }),
);
