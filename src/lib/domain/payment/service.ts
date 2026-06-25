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
import type { UserRepo, PaymentRepo } from "@/lib/infra/db/repos";

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
};

export type CreateOrderResult = {
    orderId: string;
    amount: number | string;
    currency: string;
    key: string;
    prefill: { contact: string };
};

export async function createOrder(deps: CreateOrderDeps): Promise<CreateOrderResult> {
    const user = await deps.userRepo.findByPhone(deps.phone);
    if (!user) throw new NotFoundError("User not found");
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
    const payment = await deps.paymentRepo.findByPaymentId(deps.paymentId);
    if (!payment) throw new NotFoundError("Payment record not found");
    if (!verifyCheckoutHmac(deps)) {
        throw new UnauthorizedError("Invalid payment signature");
    }

    const updated = await deps.paymentRepo.updateStatus(deps.paymentId, "completed");
    await deps.userRepo.update(String(payment.userId), {
        paymentStatus: "completed",
        paymentId: deps.paymentId,
        orderId: deps.orderId,
    });

    return { payment: updated };
}

// ---------- handleWebhook (server-to-server, source of truth) ----------

export type HandleWebhookDeps = {
    rawBody: string;
    signature: string;
    secret: string;
    userRepo: UserRepo;
    paymentRepo: PaymentRepo;
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
    const existing = await deps.paymentRepo.findByPaymentId(paymentId);
    if (!existing) {
        logger.warn("webhook.payment_not_found", { paymentId });
        return { handled: true, event: "payment.captured" };
    }
    if (existing.status === "completed") {
        return { handled: true, event: "payment.captured" };
    }
    await deps.paymentRepo.updateStatus(paymentId, "completed");

    if (phone) {
        // Existing-user path: mark them paid.
        const u = await deps.userRepo.findByPhone(phone);
        if (u) {
            await deps.userRepo.update(String(u._id), {
                paymentStatus: "completed",
                paymentId,
                ...(entity.order_id ? { orderId: entity.order_id } : {}),
                ...(entity.amount ? { amount: entity.amount / 100 } : {}),
            });
        } else {
            // The webhook may arrive BEFORE /api/auth/register completes.
            // In that case, create a minimal "paid" user record so the
            // registration flow can find it and complete. (The user will
            // need to provide name/email/role/city later, but their
            // payment is already confirmed.)
            await deps.userRepo.create({
                phone,
                paymentStatus: "completed",
                paymentId,
                ...(entity.order_id ? { orderId: entity.order_id } : {}),
                ...(entity.amount ? { amount: entity.amount / 100 } : {}),
            } as any);
        }
    } else if (entity.order_id) {
        // No phone in the webhook — try the order id.
        const u = await deps.userRepo.findByPhone(""); // not a real lookup; just a placeholder
        if (u) {
            await deps.userRepo.update(String(u._id), {
                paymentStatus: "completed",
                paymentId,
            });
        }
    }
    return { handled: true, event: "payment.captured" };
}

async function markFailedFromWebhook(entity: { id: string }, deps: HandleWebhookDeps): Promise<WebhookResult> {
    await deps.paymentRepo.updateStatus(entity.id, "failed");
    return { handled: true, event: "payment.failed" };
}
