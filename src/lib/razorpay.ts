import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "@/lib/env";

const RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = env.RAZORPAY_WEBHOOK_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    // eslint-disable-next-line no-console
    console.warn("[Razorpay] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — payment endpoints will fail");
}

export const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID || "rzp_test_placeholder",
    key_secret: RAZORPAY_KEY_SECRET || "placeholder_secret",
});

export const REGISTRATION_AMOUNT_PAISE = 1499 * 100; // ₹1499
export const REGISTRATION_AMOUNT_RUPEES = 1499;
export const REGISTRATION_CURRENCY = "INR";

/**
 * Verify Razorpay checkout signature (returned to client after payment).
 * Used by frontend confirmation flow.
 */
export function verifyCheckoutSignature({
    orderId,
    paymentId,
    signature,
}: {
    orderId: string;
    paymentId: string;
    signature: string;
}): boolean {
    if (!RAZORPAY_KEY_SECRET) return false;
    const body = orderId + "|" + paymentId;
    const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(body).digest("hex");
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
        return false;
    }
}

/**
 * Verify Razorpay webhook signature (from server-to-server webhook call).
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
    if (!RAZORPAY_WEBHOOK_SECRET) {
        // Phase 0 fix: previously this returned false silently in production
        // when the env was missing, causing every webhook to 400. We still
        // can't recover from a missing secret at runtime, but the env module
        // throws at boot in production if it's not set.
        // eslint-disable-next-line no-console
        console.warn("[Razorpay] webhook signature verification skipped — RAZORPAY_WEBHOOK_SECRET not set");
        return false;
    }
    const expected = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
        return false;
    }
}
