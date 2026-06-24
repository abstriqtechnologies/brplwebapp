import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectDB();
        const docs = await Event.find({}).sort({ startDate: -1 }).lean();
        return NextResponse.json({
            success: true,
            data: docs.map((d) => ({ ...d, _id: d._id.toString() })),
        });
    } catch (err: any) {
        console.error("[api/events]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
