/**
 * POST /api/auth/register
 *
 * Phase 3.6: business logic in `@/lib/domain/auth/service`. The route
 *   - requires a valid pending cookie (via `requirePending`),
 *   - validates the input,
 *   - calls the service,
 *   - issues the full auth cookie and clears the pending one.
 *
 * Note: the `hard navigation` pattern in the original (window.location.href
 * after a Set-Cookie) is preserved by returning the `redirect` URL — the
 * client handles the actual navigation.
 */

import { z } from "zod";
import { withRequest, withPending } from "@/lib/api/handlers";
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
    paymentId: z.string().min(1, "Payment id is required"),
    orderId: z.string().min(1, "Order id is required"),
});

export const POST = withRequest(
    withPending(async ({ pending, req }) => {
        const body = parse(await req.json().catch(() => ({})), schema);

        const user = await registerUser(
            {
                phone: pending.session.phone,
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
        // so the new auth cookie can carry paid:true immediately.
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
