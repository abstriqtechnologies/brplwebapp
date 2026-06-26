/**
 * POST /api/auth/register
 *
 * Phase 3.6: business logic in `@/lib/domain/auth/service`. The route
 *   - accepts any of: a pending cookie (new user), an unpaid auth cookie
 *     (returning user paying now), or a paid auth cookie (webhook-first
 *     race: cookie was upgraded before the profile fields were written),
 *   - validates the input,
 *   - calls the service,
 *   - issues the full auth cookie and clears the pending one.
 *
 * Note: the `hard navigation` pattern in the original (window.location.href
 * after a Set-Cookie) is preserved by returning the `redirect` URL — the
 * client handles the actual navigation.
 */

import { z } from "zod";
import { withRequest, withRegisterSession } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { parse } from "@/lib/api/parse";
import { registerUser } from "@/lib/domain/auth/service";
import { signAuth } from "@/lib/auth/crypto";
import { setAuthCookie, clearPendingCookie } from "@/lib/auth/cookies";
import { MongooseUserRepo } from "@/lib/infra/db/mongoose-repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    name: z.string().trim().min(2, "Name is too short").max(80),
    email: z.string().trim().email("Invalid email").max(120),
    role: z.enum(["batsman", "bowler", "allrounder", "wicketkeeper"]),
    state: z.string().trim().min(2, "State is required").max(60),
    city: z.string().trim().min(2, "City is required").max(60),
    // paymentId / orderId are optional: when the client lacks them (e.g.
    // the webhook arrived before the Razorpay modal's handler fired), the
    // User record already carries the values stamped on by verifyPayment
    // or the webhook. registerUser prefers client-supplied values and
    // falls back to the existing record.
    paymentId: z.string().min(1).optional(),
    orderId: z.string().min(1).optional(),
});

export const POST = withRequest(
    withRegisterSession(async ({ session, req }) => {
        const body = parse(await req.json().catch(() => ({})), schema);

        const user = await registerUser(
            {
                phone: session.phone,
                // When a userId is present (auth cookie), the User record
                // already exists from createOrder / the webhook — registerUser
                // will enrich it via the existing-user branch.
                userId: session.userId,
                name: body.name,
                email: body.email,
                role: body.role,
                state: body.state,
                city: body.city,
                paymentId: body.paymentId,
                orderId: body.orderId,
            },
            { userRepo: new MongooseUserRepo() },
        );

        // Upgrade to full auth cookie and clear the pending one.
        // registerUser always sets paymentStatus: "completed" (see service),
        // so the new auth cookie can carry paid:true immediately. If the
        // request came in on an auth cookie (webhook-first race), the cookie
        // is simply re-issued with the same paid:true and cleared pending
        // is a no-op.
        const authToken = await signAuth({
            sub: user._id.toString(),
            phone: user.phone,
            paid: true,
        });
        await setAuthCookie(authToken);
        await clearPendingCookie();

        return ok({
            success: true,
            user: {
                id: user._id.toString(),
                phone: user.phone,
                name: user.name,
                email: user.email,
                role: user.role,
                state: user.state,
                city: user.city,
                paymentStatus: user.paymentStatus,
            },
            redirect: "/dashboard",
        });
    }),
);
