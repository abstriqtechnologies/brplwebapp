import "server-only";
import { cookies } from "next/headers";
import { COOKIE_NAMES, verifyJwt, type SessionPayload } from "@/lib/jwt";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export type AuthSession = {
    sub: string;
    phone: string;
    name?: string;
    email?: string;
    role?: string;
    state?: string;
    city?: string;
    paymentStatus?: "pending" | "completed";
    Trial_status?: "pending" | "completed";
    paymentId?: string;
    orderId?: string;
    amount?: number;
    couponId?: string;
    couponCode?: string;
    couponDiscount?: number;
    couponAppliedAt?: Date;
    profileImage?: string;
};

export async function getAuthSession(): Promise<AuthSession | null> {
    const c = await cookies();
    const token = c.get(COOKIE_NAMES.AUTH)?.value;
    if (!token) return null;
    const payload = await verifyJwt<SessionPayload>(token);
    if (!payload || payload.purpose !== "auth") return null;

    await connectDB();
    const user = await User.findById(payload.sub).lean();
    if (!user) return null;

    return {
        sub: user._id.toString(),
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        state: user.state,
        city: user.city,
        paymentStatus: user.paymentStatus,
        Trial_status: user.Trial_status ?? "pending",
        paymentId: user.paymentId,
        orderId: user.orderId,
        amount: user.amount,
        couponId: user.couponId ? user.couponId.toString() : undefined,
        couponCode: user.couponCode,
        couponDiscount: user.couponDiscount,
        couponAppliedAt: user.couponAppliedAt,
        profileImage: user.profileImage,
    };
}
