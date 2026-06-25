/**
 * POST /api/payment/verify
 *
 * Client-side confirmation endpoint. Defense in depth on top of the webhook
 * (which is the source of truth).
 *
 * Phase 3.6b: business logic in `@/lib/domain/payment/service`.
 */

import { z } from "zod";
import { withRequest } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { parse } from "@/lib/api/parse";
import { verifyPayment as verifyPaymentService } from "@/lib/domain/payment/service";
import { env } from "@/lib/env";
import { MongooseUserRepo, MongoosePaymentRepo } from "@/lib/infra/db/mongoose-repos";
import { signAuth } from "@/lib/auth/crypto";
import { setAuthCookie, clearPendingCookie } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    orderId: z.string().min(1),
    paymentId: z.string().min(1),
    signature: z.string().min(1),
});

export const POST = withRequest(async ({ req }) => {
    const body = parse(await req.json().catch(() => ({})), schema);

    const result = await verifyPaymentService({
        paymentId: body.paymentId,
        orderId: body.orderId,
        signature: body.signature,
        secret: env.RAZORPAY_KEY_SECRET || "",
        userRepo: new MongooseUserRepo(),
        paymentRepo: new MongoosePaymentRepo(),
    });

    // Re-issue the auth cookie with paid:true so the user lands on /dashboard
    // without going through /login again. If they only had a pending cookie,
    // upgrade it to full auth.
    const authToken = await signAuth({
        sub: result.user._id.toString(),
        phone: result.user.phone,
        paid: true,
    });
    await setAuthCookie(authToken);
    await clearPendingCookie();

    return ok({
        success: true,
        orderId: body.orderId,
        paymentId: body.paymentId,
        redirect: "/dashboard",
    });
});
