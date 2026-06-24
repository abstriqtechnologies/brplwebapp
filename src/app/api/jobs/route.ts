import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectDB();
        const docs = await Job.find({ active: true }).sort({ createdAt: -1 }).lean();
        return NextResponse.json({
            success: true,
            data: docs.map((d) => ({ ...d, _id: d._id.toString() })),
        });
    } catch (err: any) {
        console.error("[api/jobs]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
