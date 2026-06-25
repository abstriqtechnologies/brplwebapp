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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    orderId: z.string().min(1),
    paymentId: z.string().min(1),
    signature: z.string().min(1),
});

export const POST = withRequest(async ({ req }) => {
    const body = parse(await req.json().catch(() => ({})), schema);

    await verifyPaymentService({
        paymentId: body.paymentId,
        orderId: body.orderId,
        signature: body.signature,
        secret: env.RAZORPAY_KEY_SECRET || "",
        userRepo: new MongooseUserRepo(),
        paymentRepo: new MongoosePaymentRepo(),
    });

    return ok({
        success: true,
        orderId: body.orderId,
        paymentId: body.paymentId,
        redirect: "/login?next=/dashboard",
    });
});
