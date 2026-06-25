/**
 * Coupon domain — validation and redemption.
 *
 * Pure business logic over `CouponRepo`. No NextResponse, no Mongoose.
 *
 * `validateCoupon` does NOT consume. It returns the discount and final
 * amount the UI should display. The caller (typically the /checkout
 * client) may then call `redeemCoupon` to consume.
 *
 * `redeemCoupon` does:
 *   1. Re-validate (in case the coupon was edited/expired between
 *      validate and redeem).
 *   2. Reject if the user already redeemed this coupon.
 *   3. Increment usedCount + record CouponUsage.
 *   4. Return the discount + finalAmount for the caller to persist on
 *      the resulting Payment record.
 */

import "server-only";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import type { CouponRepo } from "@/lib/infra/db/repos";

export type ValidateCouponDeps = {
    code: string;
    orderAmountRupees: number;
    couponRepo: CouponRepo;
    now?: () => number;
};

export type ValidateCouponResult =
    | { valid: true; couponId: string; discount: number; finalAmount: number; reason?: never }
    | { valid: false; reason: "not_found" | "inactive" | "expired" | "exhausted" | "min_order" };

export async function validateCoupon(deps: ValidateCouponDeps): Promise<ValidateCouponResult> {
    const coupon = await deps.couponRepo.findByCode(deps.code);
    if (!coupon) return { valid: false, reason: "not_found" };
    if (!coupon.active) return { valid: false, reason: "inactive" };
    const now = (deps.now ?? Date.now)();
    if (coupon.expiresAt && coupon.expiresAt.getTime() < now) {
        return { valid: false, reason: "expired" };
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        return { valid: false, reason: "exhausted" };
    }
    if (coupon.minOrderAmount && deps.orderAmountRupees < coupon.minOrderAmount) {
        return { valid: false, reason: "min_order" };
    }
    const rawDiscount =
        coupon.type === "percent"
            ? Math.round((deps.orderAmountRupees * coupon.amount) / 100)
            : coupon.amount;
    const discount = Math.min(rawDiscount, deps.orderAmountRupees);
    const finalAmount = deps.orderAmountRupees - discount;
    return {
        valid: true,
        couponId: String(coupon._id),
        discount,
        finalAmount,
    };
}

export type RedeemCouponDeps = {
    code: string;
    userId: string;
    orderAmountRupees: number;
    couponRepo: CouponRepo;
    now?: () => number;
};

export type RedeemCouponResult = {
    couponId: string;
    code: string;
    discount: number;
    finalAmount: number;
};

export async function redeemCoupon(deps: RedeemCouponDeps): Promise<RedeemCouponResult> {
    const validation = await validateCoupon({
        code: deps.code,
        orderAmountRupees: deps.orderAmountRupees,
        couponRepo: deps.couponRepo,
        ...(deps.now ? { now: deps.now } : {}),
    });
    if (!validation.valid) {
        if (validation.reason === "not_found") throw new NotFoundError("Coupon not found");
        throw new ConflictError(`Coupon cannot be redeemed: ${validation.reason}`);
    }
    const existing = await deps.couponRepo.findUsageForUser(validation.couponId, deps.userId);
    if (existing) {
        throw new ConflictError("You have already redeemed this coupon");
    }
    const coupon = await deps.couponRepo.findById(validation.couponId);
    if (!coupon) throw new NotFoundError("Coupon not found");

    await deps.couponRepo.incrementUsage(validation.couponId);
    await deps.couponRepo.createUsage({
        couponId: validation.couponId as any,
        userId: deps.userId as any,
        code: coupon.code,
        discountApplied: validation.discount,
    });

    return {
        couponId: validation.couponId,
        code: coupon.code,
        discount: validation.discount,
        finalAmount: validation.finalAmount,
    };
}