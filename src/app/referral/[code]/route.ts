import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Referral from "@/models/Referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
    const code = decodeURIComponent(params.code || "")
        .trim()
        .toUpperCase();
    const url = new URL("/checkout", req.url);

    if (!code) {
        return NextResponse.redirect(url);
    }

    await connectDB();
    const referral = await Referral.findOneAndUpdate(
        { code },
        { $inc: { linkOpenCount: 1 }, $set: { lastOpenedAt: new Date() } },
        { returnDocument: "after" },
    ).lean();

    if (referral?.couponCode) {
        url.searchParams.set("ref", referral.couponCode);
    }

    return NextResponse.redirect(url);
}
