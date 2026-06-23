import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import OtpRecord from "@/models/OtpRecord";
import { sendSmsOtp } from "@/lib/sms";
import { generateOtp, normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds between OTPs

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const phone = normalizePhone(String(body.phone || ""));
        if (!phone) {
            return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
        }

        await connectDB();

        // Rate limit: don't allow resend within cooldown
        const recent = await OtpRecord.findOne({ phone, verified: false })
            .sort({ createdAt: -1 })
            .lean();
        if (recent && Date.now() - new Date(recent.createdAt).getTime() < RESEND_COOLDOWN_MS) {
            const waitSec = Math.ceil(
                (RESEND_COOLDOWN_MS - (Date.now() - new Date(recent.createdAt).getTime())) / 1000
            );
            return NextResponse.json(
                { error: `Please wait ${waitSec}s before requesting a new OTP` },
                { status: 429 }
            );
        }

        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + OTP_TTL_MS);

        await OtpRecord.create({ phone, otp, expiresAt, attempts: 0, verified: false });

        const sent = await sendSmsOtp(phone, otp, "registration");
        if (!sent) {
            return NextResponse.json({ error: "Failed to send OTP. Please try again." }, { status: 502 });
        }

        return NextResponse.json({
            success: true,
            message: "OTP sent",
            expiresInSec: OTP_TTL_MS / 1000,
        });
    } catch (err: any) {
        console.error("[send-otp]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
