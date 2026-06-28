/**
 * Payment service — wraps Razorpay SDK calls behind a testable interface.
 *
 * The Razorpay client is injected. In production the route handler passes
 * the singleton from `@/lib/razorpay`; in tests we pass a mock with
 * `razorpay.orders.create = vi.fn(...)`.
 *
 * HMAC verification reuses the existing helpers in `@/lib/razorpay`
 * (`verifyCheckoutSignature` / `verifyWebhookSignature`) — we don't
 * reimplement crypto.
 */

import "server-only";
import crypto from "crypto";
import { ConflictError, NotFoundError, UnauthorizedError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import type { UserRepo, PaymentRepo, CouponRepo } from "@/lib/infra/db/repos";
import type { IUser } from "@/models/User";

export type RazorpayLike = {
    orders: {
        create: (params: {
            amount: number | string;
            currency: string;
            receipt: string;
            notes?: Record<string, string>;
        }) => Promise<{ id: string; amount: number | string; currency: string }>;
    };
};

// ---------- createOrder ----------

export type CreateOrderDeps = {
    phone: string;
    amountPaise: number;
    currency: string;
    razorpay: RazorpayLike;
    userRepo: UserRepo;
    paymentRepo: PaymentRepo;
    keyId: string;
    coupon?: {
        id: string;
        code: string;
        discount: number;
    };
};

export type CreateOrderResult = {
    orderId: string;
    amount: number | string;
    currency: string;
    key: string;
    prefill: { contact: string };
};

export async function createOrder(deps: CreateOrderDeps): Promise<CreateOrderResult> {
    let user = await deps.userRepo.findByPhone(deps.phone);
    if (!user) {
        // Login via OTP only issues a `pending` cookie — it does not create
        // a User record. The payment flow is the first place we know the
        // visitor is a real person about to pay, so create a minimal
        // "pending payment" user here. The /api/auth/register step that
        // runs after the Razorpay webhook will enrich the record with
        // name/email/role/city. (This mirrors the webhook fallback further
        // down in this file.)
        logger.info("payment.create_order.user_auto_created", { phone: deps.phone });
        user = await deps.userRepo.create({
            phone: deps.phone,
            paymentStatus: "pending",
        } as any);
    }
    if (user.paymentStatus === "completed") {
        throw new ConflictError("User already registered", { details: { redirect: "/dashboard" } });
    }

    const order = await deps.razorpay.orders.create({
        amount: deps.amountPaise,
        currency: deps.currency,
        receipt: `brpl_${deps.phone}_${Date.now()}`,
        notes: { phone: deps.phone, purpose: "registration" },
    });

    await deps.paymentRepo.create({
        userId: String(user._id),
        paymentId: order.id, // Razorpay uses order_id as the canonical id at order-create time
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        status: "created",
        source: "razorpay",
        ...(deps.coupon
            ? {
                  couponId: deps.coupon.id,
                  couponCode: deps.coupon.code,
                  couponDiscount: deps.coupon.discount,
              }
            : {}),
    });

    return {
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        key: deps.keyId,
        prefill: { contact: deps.phone },
    };
}

// ---------- verifyPayment (client-side confirmation) ----------

export type VerifyPaymentDeps = {
    paymentId: string;
    orderId: string;
    signature: string;
    secret: string;
    userRepo: UserRepo;
    paymentRepo: PaymentRepo;
};

export type VerifyPaymentResult = {
    payment: Awaited<ReturnType<PaymentRepo["findByPaymentId"]>>;
    user: IUser;
};

function constantTimeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

function verifyCheckoutHmac({
    orderId,
    paymentId,
    signature,
    secret,
}: {
    orderId: string;
    paymentId: string;
    signature: string;
    secret: string;
}): boolean {
    if (!secret) return false;
    const body = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    try {
        return constantTimeEqual(expected, signature);
    } catch {
        return false;
    }
}

export async function verifyPayment(deps: VerifyPaymentDeps): Promise<VerifyPaymentResult> {
    // At order-creation time we stored the Razorpay *order id* in the
    // `paymentId` field because no payment id exists yet. The client
    // posts the real `razorpay_payment_id` from the checkout handler, so
    // looking up by `paymentId` here would always miss. Look up by
    // `orderId` (which both sides agree on), then persist the real
    // payment id alongside the status update.
    const payment = await deps.paymentRepo.findByOrderId(deps.orderId);
    if (!payment) throw new NotFoundError("Payment record not found");
    if (!verifyCheckoutHmac(deps)) {
        throw new UnauthorizedError("Invalid payment signature");
    }

    // Stamp the real payment id onto the Payment row so subsequent
    // queries (including the webhook fallback) can find it by paymentId.
    const updated = await deps.paymentRepo.updateForVerify(deps.orderId, {
        status: "completed",
        paymentId: deps.paymentId,
    });
    const user = await deps.userRepo.update(String(payment.userId), {
        paymentStatus: "completed",
        paymentId: deps.paymentId,
        orderId: deps.orderId,
    });
    if (!user) throw new NotFoundError("User for payment not found");

    return { payment: updated ?? payment, user };
}

// ---------- handleWebhook (server-to-server, source of truth) ----------

export type HandleWebhookDeps = {
    rawBody: string;
    signature: string;
    secret: string;
    userRepo: UserRepo;
    paymentRepo: PaymentRepo;
    couponRepo?: CouponRepo;
};

export type WebhookResult = { handled: boolean; event?: string };

export async function handleWebhook(deps: HandleWebhookDeps): Promise<WebhookResult> {
    if (!verifyWebhookHmac(deps.rawBody, deps.signature, deps.secret)) {
        throw new UnauthorizedError("Invalid webhook signature");
    }

    let parsed: any;
    try {
        parsed = JSON.parse(deps.rawBody);
    } catch {
        // Unparseable but signature-valid body — accept and ignore.
        return { handled: true };
    }

    const event = parsed?.event;
    const entity = parsed?.payload?.payment?.entity;
    if (!event || !entity) return { handled: true };

    if (event === "payment.captured") {
        return markPaidFromWebhook(entity, deps);
    }
    if (event === "payment.failed") {
        return markFailedFromWebhook(entity, deps);
    }
    // Other events (refunded, dispute.created, etc.) — log and ignore.
    logger.info("webhook.ignored", { event });
    return { handled: true, event };
}

function verifyWebhookHmac(rawBody: string, signature: string, secret: string): boolean {
    if (!secret) return false;
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
        return constantTimeEqual(expected, signature);
    } catch {
        return false;
    }
}

async function markPaidFromWebhook(
    entity: { id: string; order_id?: string; amount?: number; notes?: { phone?: string } },
    deps: HandleWebhookDeps,
): Promise<WebhookResult> {
    const paymentId = entity.id;
    const phone = entity.notes?.phone;
    const existing =
        (await deps.paymentRepo.findByPaymentId(paymentId)) ??
        (entity.order_id ? await deps.paymentRepo.findByOrderId(entity.order_id) : null);
    if (!existing) {
        logger.warn("webhook.payment_not_found", { paymentId });
        return { handled: true, event: "payment.captured" };
    }

    const paymentForCoupon =
        existing.status === "completed"
            ? existing
            : entity.order_id
              ? ((await deps.paymentRepo.updateForVerify(entity.order_id, {
                    status: "completed",
                    paymentId,
                })) ?? existing)
              : ((await deps.paymentRepo.updateStatus(existing.paymentId, "completed")) ?? existing);

    let user = await deps.userRepo.findById(String(existing.userId));
    if (!user && phone) {
        user = await deps.userRepo.findByPhone(phone);
    }

    if (user) {
        const updated = await deps.userRepo.update(String(user._id), {
            paymentStatus: "completed",
            paymentId,
            ...(entity.order_id ? { orderId: entity.order_id } : {}),
            ...(entity.amount ? { amount: entity.amount / 100 } : {}),
        });
        user = updated ?? user;
    } else if (phone) {
        // The webhook may arrive BEFORE /api/auth/register completes.
        // In that case, create a minimal "paid" user record so the
        // registration flow can find it and complete.
        user = await deps.userRepo.create({
            phone,
            paymentStatus: "completed",
            paymentId,
            ...(entity.order_id ? { orderId: entity.order_id } : {}),
            ...(entity.amount ? { amount: entity.amount / 100 } : {}),
        } as any);
    } else {
        logger.warn("webhook.user_not_found", {
            paymentId,
            orderId: entity.order_id,
            userId: String(existing.userId),
        });
    }

    if (user) {
        await recordCouponUsageFromPayment(paymentForCoupon, String(user._id), deps);
    }

    return { handled: true, event: "payment.captured" };
}

type PaymentWithCoupon = NonNullable<Awaited<ReturnType<PaymentRepo["findByOrderId"]>>>;

async function recordCouponUsageFromPayment(
    payment: PaymentWithCoupon,
    userId: string,
    deps: HandleWebhookDeps,
): Promise<void> {
    if (!deps.couponRepo || !payment.couponId || !payment.couponCode) return;

    const couponId = String(payment.couponId);
    const code = payment.couponCode.trim().toUpperCase();
    const coupon = await deps.couponRepo.findByCode(code);
    if (!coupon || String(coupon._id) !== couponId) {
        logger.warn("coupon.webhook_mismatch", {
            code,
            couponId,
            found: !!coupon,
            paymentId: payment.paymentId,
            orderId: payment.orderId,
        });
        return;
    }

    const discountApplied = payment.couponDiscount ?? 0;
    const existingUsage = await deps.couponRepo.findUsageForUser(couponId, userId);
    if (!existingUsage) {
        await deps.couponRepo.incrementUsage(couponId);
        await deps.couponRepo.createUsage({
            couponId: couponId as any,
            userId: userId as any,
            code,
            discountApplied,
            orderId: payment.orderId,
        });
        logger.info("coupon.used_for_webhook_payment", {
            userId,
            code,
            discount: discountApplied,
            paymentId: payment.paymentId,
        });
    }

    await deps.userRepo.update(userId, {
        couponId: couponId as any,
        couponCode: code,
        couponDiscount: discountApplied,
        couponAppliedAt: new Date(),
    });
}

async function markFailedFromWebhook(entity: { id: string }, deps: HandleWebhookDeps): Promise<WebhookResult> {
    await deps.paymentRepo.updateStatus(entity.id, "failed");
    return { handled: true, event: "payment.failed" };
}
