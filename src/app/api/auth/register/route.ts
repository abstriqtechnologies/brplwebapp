import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User, { USER_ROLES, type UserRole } from "@/models/User";
import { getPendingCookie, signJwt, setAuthCookie, clearAuthCookies } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
    name: z.string().trim().min(2, "Name is too short").max(80),
    email: z.string().trim().email("Invalid email").max(120),
    role: z.enum(USER_ROLES),
    state: z.string().trim().min(2, "State is required").max(60),
    city: z.string().trim().min(2, "City is required").max(60),
    paymentId: z.string().min(1, "Payment id is required"),
    orderId: z.string().min(1, "Order id is required"),
});

export async function POST(req: Request) {
    try {
        const token = await getPendingCookie();
        if (!token) {
            return NextResponse.json(
                { error: "Registration session expired. Please verify OTP again." },
                { status: 401 }
            );
        }

        // Re-verify pending cookie
        const { jwtVerify } = await import("jose");
        const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-insecure-secret-change-me");
        let pending: any;
        try {
            const { payload } = await jwtVerify(token, SECRET);
            pending = payload;
        } catch {
            return NextResponse.json({ error: "Invalid session. Please re-verify." }, { status: 401 });
        }
        if (pending.purpose !== "pending_reg" || !pending.phone) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        const json = await req.json().catch(() => ({}));
        const parsed = bodySchema.safeParse(json);
        if (!parsed.success) {
            const first = parsed.error.issues[0];
            return NextResponse.json({ error: first?.message || "Invalid input" }, { status: 400 });
        }
        const data = parsed.data;

        await connectDB();

        // Verify user does not exist (idempotency)
        let user = await User.findOne({ phone: pending.phone });
        if (user) {
            return NextResponse.json(
                { error: "User already registered. Please login." },
                { status: 409 }
            );
        }

        user = await User.create({
            phone: pending.phone,
            name: data.name,
            email: data.email,
            role: data.role as UserRole,
            state: data.state,
            city: data.city,
            paymentStatus: "completed",
            paymentId: data.paymentId,
            orderId: data.orderId,
            amount: 1499,
        });

        // Upgrade to full auth cookie
        const authToken = await signJwt({
            sub: user._id.toString(),
            phone: user.phone,
            purpose: "auth",
        });
        await setAuthCookie(authToken);
        await clearAuthCookies();

        return NextResponse.json({
            success: true,
            user: {
                id: user._id.toString(),
                phone: user.phone,
                name: user.name,
                email: user.email,
                role: user.role,
                state: user.state,
                city: user.city,
                paymentStatus: user.paymentStatus,
            },
            redirect: "/dashboard",
        });
    } catch (err: any) {
        console.error("[register]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
