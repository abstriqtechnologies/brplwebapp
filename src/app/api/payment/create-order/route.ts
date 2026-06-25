/**
 * POST /api/payment/create-order
 *
 * Phase 3.6b: business logic in `@/lib/domain/payment/service`. The route
 *   - requires a valid pending cookie,
 *   - calls the service to create the Razorpay order,
 *   - returns the order details to the client.
 */

import { withRequest, withPending } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { createOrder as createOrderService } from "@/lib/domain/payment/service";
import { razorpay, REGISTRATION_AMOUNT_PAISE, REGISTRATION_CURRENCY } from "@/lib/razorpay";
import { env } from "@/lib/env";
import { MongooseUserRepo, MongoosePaymentRepo } from "@/lib/infra/db/mongoose-repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withRequest(
    withPending(async ({ pending }) => {
        const result = await createOrderService({
            phone: pending.session.phone,
            amountPaise: REGISTRATION_AMOUNT_PAISE,
            currency: REGISTRATION_CURRENCY,
            razorpay,
            userRepo: new MongooseUserRepo(),
            paymentRepo: new MongoosePaymentRepo(),
            keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || "",
        });
        return ok({
            success: true,
            orderId: result.orderId,
            amount: result.amount,
            currency: result.currency,
            key: result.key,
            prefill: result.prefill,
            notes: { phone: pending.session.phone },
        });
    }),
);
