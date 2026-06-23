import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook handler. Verifies signature, then updates the user.
 * This is the source of truth for payment status.
 *
 * To configure: in Razorpay dashboard, set webhook URL to:
 *   https://<your-domain>/api/payment/webhook
 * And active events: payment.captured, payment.failed, order.paid
 */
export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-razorpay-signature") || "";
        const ok = verifyWebhookSignature(rawBody, signature);
        if (!ok) {
            console.warn("[webhook] Invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        const event = JSON.parse(rawBody);
        const eventType = event?.event;
        const paymentEntity = event?.payload?.payment?.entity;
        const orderEntity = event?.payload?.order?.entity;

        if (eventType === "payment.captured" && paymentEntity) {
            const phone = paymentEntity.notes?.phone || orderEntity?.notes?.phone;
            const orderId = paymentEntity.order_id || orderEntity?.id;
            const paymentId = paymentEntity.id;

            await connectDB();

            if (phone) {
                // Upsert by phone so we capture the payment even before user record exists
                await User.findOneAndUpdate(
                    { phone },
                    {
                        $set: {
                            paymentStatus: "completed",
                            paymentId,
                            orderId,
                            amount: paymentEntity.amount ? paymentEntity.amount / 100 : 1499,
                        },
                        $setOnInsert: { phone, paymentStatus: "completed" },
                    },
                    { upsert: true, new: true }
                );
            } else if (orderId) {
                await User.findOneAndUpdate(
                    { orderId },
                    {
                        $set: {
                            paymentStatus: "completed",
                            paymentId,
                            amount: paymentEntity.amount ? paymentEntity.amount / 100 : 1499,
                        },
                    }
                );
            }
        } else if (eventType === "payment.failed" && paymentEntity) {
            const phone = paymentEntity.notes?.phone || orderEntity?.notes?.phone;
            if (phone) {
                await connectDB();
                await User.findOneAndUpdate(
                    { phone },
                    { $set: { paymentStatus: "pending" } }
                );
            }
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error("[webhook]", err);
        return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
    }
}
