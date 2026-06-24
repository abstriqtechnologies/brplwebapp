import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { verifyCheckoutSignature } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Client-side confirmation endpoint.
 * Called by the frontend after Razorpay checkout returns success.
 * Verifies the signature (defense in depth on top of the webhook).
 */
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { orderId, paymentId, signature } = body as {
            orderId?: string;
            paymentId?: string;
            signature?: string;
        };
        if (!orderId || !paymentId || !signature) {
            return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
        }

        const ok = verifyCheckoutSignature({ orderId, paymentId, signature });
        if (!ok) {
            return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
        }

        await connectDB();
        // Best-effort: mark user as paid if a row exists; the webhook is the source of truth.
        await User.findOneAndUpdate(
            { orderId },
            { $set: { paymentStatus: "completed", paymentId } },
            { new: true }
        );

        return NextResponse.json({
            success: true,
            orderId,
            paymentId,
            redirect: "/login?next=/dashboard",
        });
    } catch (err: any) {
        console.error("[payment/verify]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
