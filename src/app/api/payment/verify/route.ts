/**
 * POST /api/payment/verify
 *
 * Client-side confirmation endpoint. Defense in depth on top of the webhook
 * (which is the source of truth).
 *
 * Phase 3.6b: business logic in `@/lib/domain/payment/service`.
 *
 * Coupon usage: for partial-discount payments the coupon must be consumed
 * here (after the Razorpay payment is confirmed) so usage count is
 * incremented. The 100%-off path goes through `/api/payment/redeem-coupon`
 * instead.
 */

import { z } from "zod";
import { withRequest } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { parse } from "@/lib/api/parse";
import { verifyPayment as verifyPaymentService } from "@/lib/domain/payment/service";
import { env } from "@/lib/env";
import {
    MongooseUserRepo,
    MongoosePaymentRepo,
    MongooseCouponRepo,
} from "@/lib/infra/db/mongoose-repos";
import { signAuth } from "@/lib/auth/crypto";
import { setAuthCookie, clearPendingCookie } from "@/lib/auth/cookies";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    orderId: z.string().min(1),
    paymentId: z.string().min(1),
    signature: z.string().min(1),
    couponId: z.string().optional(),
    couponCode: z.string().trim().min(1).optional(),
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

    // If a coupon was applied to this payment, record usage now.
    // At this point the Razorpay payment is confirmed, so we just need
    // to guard against double-counting (`findUsageForUser`) and ensure
    // the coupon still exists.
    if (body.couponId && body.couponCode) {
        const couponRepo = new MongooseCouponRepo();
        const code = body.couponCode.trim().toUpperCase();
        const coupon = await couponRepo.findByCode(code);
        if (coupon && String(coupon._id) === String(body.couponId)) {
            const userId = String(result.user._id);
            const existing = await couponRepo.findUsageForUser(String(coupon._id), userId);
            if (!existing) {
                await couponRepo.incrementUsage(String(coupon._id));
                await couponRepo.createUsage({
                    couponId: String(coupon._id) as any,
                    userId: userId as any,
                    code,
                    discountApplied: coupon.amount, // accurate since validateCoupon was called at order-creation time
                });
                logger.info("coupon.used_for_payment", {
                    userId,
                    code,
                    discount: coupon.amount,
                    paymentId: body.paymentId,
                });
            }
        } else {
            logger.warn("coupon.verify_mismatch", {
                code,
                couponId: body.couponId,
                found: !!coupon,
                paymentId: body.paymentId,
            });
        }
    }

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