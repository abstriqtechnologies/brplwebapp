/**
 * POST /api/payment/webhook
 *
 * Razorpay server-to-server webhook. This is the SOURCE OF TRUTH for
 * payment status. The `/api/payment/verify` endpoint is a defense-in-depth
 * client-side check.
 *
 * Phase 3.6b: business logic in `@/lib/domain/payment/service`. The route
 * is a thin adapter that:
 *   - reads the raw body (HMAC needs the exact bytes, not a parsed object),
 *   - passes through to `handleWebhook` with the signature header.
 */

import { withRequest } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { handleWebhook as handleWebhookService } from "@/lib/domain/payment/service";
import { env } from "@/lib/env";
import { MongooseUserRepo, MongoosePaymentRepo, MongooseCouponRepo } from "@/lib/infra/db/mongoose-repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withRequest(async ({ req }) => {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    await handleWebhookService({
        rawBody,
        signature,
        secret: env.RAZORPAY_WEBHOOK_SECRET || "",
        userRepo: new MongooseUserRepo(),
        paymentRepo: new MongoosePaymentRepo(),
        couponRepo: new MongooseCouponRepo(),
    });

    return ok({ received: true });
});
