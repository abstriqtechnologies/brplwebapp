/**
 * POST /api/payment/create-order
 *
 * Phase 3.6b: business logic in `@/lib/domain/payment/service`. The route
 *   - requires a valid checkout session (pending cookie OR auth+unpaid),
 *   - calls the service to create the Razorpay order,
 *   - returns the order details to the client.
 *
 * Both new users (pending cookie after OTP) and returning unpaid users
 * (auth cookie with paid=false) hit /checkout and reach this endpoint.
 */

import { withRequest, withCheckoutSession } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { createOrder as createOrderService } from "@/lib/domain/payment/service";
import { razorpay, REGISTRATION_AMOUNT_PAISE, REGISTRATION_CURRENCY } from "@/lib/razorpay";
import { env } from "@/lib/env";
import { MongooseUserRepo, MongoosePaymentRepo } from "@/lib/infra/db/mongoose-repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withRequest(
    withCheckoutSession(async ({ session }) => {
        const keyId = env.NEXT_PUBLIC_RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID;
        if (!keyId) {
            // Fail loud: previously we silently returned `key: ""` and the
            // client passed it to Razorpay, which threw "No key passed" —
            // a confusing client-side error for a server misconfiguration.
            // Throwing here surfaces the missing config as a 500 instead.
            throw new Error("Razorpay key not configured on server");
        }

        const result = await createOrderService({
            phone: session.phone,
            amountPaise: REGISTRATION_AMOUNT_PAISE,
            currency: REGISTRATION_CURRENCY,
            razorpay,
            userRepo: new MongooseUserRepo(),
            paymentRepo: new MongoosePaymentRepo(),
            keyId,
        });
        return ok({
            success: true,
            orderId: result.orderId,
            amount: result.amount,
            currency: result.currency,
            key: result.key,
            prefill: result.prefill,
            notes: { phone: session.phone },
        });
    }),
);
