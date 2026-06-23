import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import OtpRecord from "@/models/OtpRecord";
import User from "@/models/User";
import { signJwt, setAuthCookie, setPendingCookie } from "@/lib/jwt";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const phone = normalizePhone(String(body.phone || ""));
        const otp = String(body.otp || "").trim();

        if (!phone || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            return NextResponse.json({ error: "Invalid phone or OTP format" }, { status: 400 });
        }

        await connectDB();

        const record = await OtpRecord.findOne({ phone, verified: false })
            .sort({ createdAt: -1 });
        if (!record) {
            return NextResponse.json({ error: "OTP not found or expired" }, { status: 400 });
        }
        if (record.expiresAt.getTime() < Date.now()) {
            return NextResponse.json({ error: "OTP expired. Please request a new one." }, { status: 400 });
        }
        if (record.attempts >= MAX_ATTEMPTS) {
            return NextResponse.json(
                { error: "Too many attempts. Please request a new OTP." },
                { status: 429 }
            );
        }
        if (record.otp !== otp) {
            record.attempts += 1;
            await record.save();
            return NextResponse.json(
                { error: "Incorrect OTP", attemptsLeft: MAX_ATTEMPTS - record.attempts },
                { status: 400 }
            );
        }

        // Mark verified
        record.verified = true;
        await record.save();

        // Check if user exists
        const existingUser = await User.findOne({ phone });

        if (existingUser) {
            // Existing user — issue full auth cookie
            const token = await signJwt({
                sub: existingUser._id.toString(),
                phone: existingUser.phone,
                purpose: "auth",
            });
            await setAuthCookie(token);
            return NextResponse.json({
                success: true,
                exists: true,
                user: {
                    id: existingUser._id.toString(),
                    phone: existingUser.phone,
                    name: existingUser.name,
                    role: existingUser.role,
                    paymentStatus: existingUser.paymentStatus,
                },
                redirect: "/dashboard",
            });
        }

        // New user — issue short-lived pending cookie
        const token = await signJwt(
            { sub: `pending:${phone}`, phone, purpose: "pending_reg" },
            "30m"
        );
        await setPendingCookie(token);
        return NextResponse.json({
            success: true,
            exists: false,
            redirect: "/payment",
        });
    } catch (err: any) {
        console.error("[verify-otp]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
