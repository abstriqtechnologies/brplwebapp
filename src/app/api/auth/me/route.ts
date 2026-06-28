import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthCookie, verifyJwt } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const token = await getAuthCookie();
        if (!token) return NextResponse.json({ user: null }, { status: 200 });

        const payload = await verifyJwt<{ sub: string; phone: string; purpose?: string }>(token);
        if (!payload || payload.purpose !== "auth") {
            return NextResponse.json({ user: null }, { status: 200 });
        }

        await connectDB();
        const user = await User.findById(payload.sub).lean();
        if (!user) return NextResponse.json({ user: null }, { status: 200 });

        return NextResponse.json({
            user: {
                id: user._id.toString(),
                phone: user.phone,
                name: user.name,
                email: user.email,
                role: user.role,
                state: user.state,
                city: user.city,
                paymentStatus: user.paymentStatus,
                couponId: user.couponId ? user.couponId.toString() : null,
                couponCode: user.couponCode ?? null,
                couponDiscount: user.couponDiscount ?? null,
                couponAppliedAt: user.couponAppliedAt ? new Date(user.couponAppliedAt).toISOString() : null,
                profileImage: user.profileImage ?? null,
            },
        });
    } catch (err) {
        console.error("[me]", err);
        return NextResponse.json({ user: null }, { status: 200 });
    }
}
