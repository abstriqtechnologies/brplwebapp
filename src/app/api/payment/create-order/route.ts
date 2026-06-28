/**
 * POST /api/payment/create-order
 *
 * Phase 3.6b: business logic in `@/lib/domain/payment/service`. The route
 *   - requires a valid checkout session (pending cookie OR auth+unpaid),
 *   - if a coupon is supplied, re-validates it server-side and uses the
 *     discounted amount for the Razorpay order,
 *   - calls the service to create the Razorpay order,
 *   - returns the order details to the client.
 *
 * Both new users (pending cookie after OTP) and returning unpaid users
 * (auth cookie with paid=false) hit /checkout and reach this endpoint.
 *
 * Coupon handling: the client already calls `?dryRun=1` to display the
 * discount, but we cannot trust the client-sent `finalAmount` — it could
 * be tampered to zero. So when `{ couponId, code }` is present, we
 * re-call `validateCoupon` here and use ITS result. The `finalAmountPaise`
 * field from the client is currently informational; the server's
 * re-validation is the source of truth.
 */

import { z } from "zod";
import { withRequest, withCheckoutSession } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError } from "@/lib/api/errors";
import { createOrder as createOrderService } from "@/lib/domain/payment/service";
import { razorpay, REGISTRATION_AMOUNT_PAISE, REGISTRATION_CURRENCY } from "@/lib/razorpay";
import { env } from "@/lib/env";
import { MongooseUserRepo, MongoosePaymentRepo, MongooseCouponRepo } from "@/lib/infra/db/mongoose-repos";
import { validateCoupon } from "@/lib/domain/coupon/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
    couponId: z.string().min(1).optional(),
    code: z.string().trim().min(1).max(64).optional(),
    finalAmountPaise: z.number().int().min(0).max(REGISTRATION_AMOUNT_PAISE).optional(),
});

export const POST = withRequest(
    withCheckoutSession(async ({ session, req }) => {
        const keyId = env.NEXT_PUBLIC_RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID;
        if (!keyId) {
            // Fail loud: previously we silently returned `key: ""` and the
            // client passed it to Razorpay, which threw "No key passed" —
            // a confusing client-side error for a server misconfiguration.
            // Throwing here surfaces the missing config as a 500 instead.
            throw new Error("Razorpay key not configured on server");
        }

        // Body is optional — anonymous callers (no coupon) POST `{}`.
        const raw = await req.json().catch(() => ({}));
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }
        const { couponId, code } = parsed.data;

        let amountPaise = REGISTRATION_AMOUNT_PAISE;
        let appliedCoupon: { id: string; code: string; discount: number; finalAmount: number } | null =
            null;

        // If the client claims a coupon is applied, re-validate it server-side.
        // We require both `couponId` and `code` together (one without the
        // other is almost certainly a bug).
        if (couponId || code) {
            if (!couponId || !code) {
                throw new BadRequestError("Provide both couponId and code");
            }
            const validation = await validateCoupon({
                code,
                orderAmountRupees: REGISTRATION_AMOUNT_PAISE / 100,
                couponRepo: new MongooseCouponRepo(),
            });
            if (!validation.valid) {
                throw new BadRequestError(`Coupon not applicable: ${validation.reason}`);
            }
            // Validate that the couponId the client sent matches the one we
            // just looked up. (Both should map to the same doc, but a mismatch
            // is a sign of tampering.)
            if (String(validation.couponId) !== String(couponId)) {
                throw new BadRequestError("Coupon mismatch");
            }
            appliedCoupon = {
                id: validation.couponId,
                code,
                discount: validation.discount,
                finalAmount: validation.finalAmount,
            };
            amountPaise = validation.finalAmount * 100;
        }

        const result = await createOrderService({
            phone: session.phone,
            amountPaise,
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
            // Echo the coupon back so the client can confirm the amount it
            // asked for is what Razorpay actually saw. If they ever diverge,
            // the client can refuse to open the checkout modal.
            coupon: appliedCoupon,
        });
    }),
);