import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { razorpay, REGISTRATION_AMOUNT_PAISE, REGISTRATION_AMOUNT_RUPEES, REGISTRATION_CURRENCY } from "@/lib/razorpay";
import { getPendingCookie, verifyJwt } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
    try {
        const token = await getPendingCookie();
        if (!token) {
            return NextResponse.json(
                { error: "Session expired. Please verify OTP again." },
                { status: 401 }
            );
        }
        const payload = await verifyJwt<{ phone: string; purpose?: string }>(token);
        if (!payload || payload.purpose !== "pending_reg" || !payload.phone) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        await connectDB();
        const existing = await User.findOne({ phone: payload.phone });
        if (existing && existing.paymentStatus === "completed") {
            return NextResponse.json(
                { error: "User is already registered", redirect: "/dashboard" },
                { status: 409 }
            );
        }

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: REGISTRATION_AMOUNT_PAISE,
            currency: REGISTRATION_CURRENCY,
            receipt: `brpl_${payload.phone}_${Date.now()}`,
            notes: { phone: payload.phone, purpose: "registration" },
        });

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
            prefill: {
                contact: payload.phone,
            },
            notes: { phone: payload.phone },
        });
    } catch (err: any) {
        console.error("[create-order]", err);
        return NextResponse.json(
            { error: err?.error?.description || "Failed to create order" },
            { status: 500 }
        );
    }
}
