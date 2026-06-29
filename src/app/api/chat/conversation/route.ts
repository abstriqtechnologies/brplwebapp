import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiLead from "@/models/AiLead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");
    const phone = searchParams.get("phone");

    if (!leadId && !phone) {
      return NextResponse.json(
        { error: "Provide leadId or phone query parameter", conversation: [] },
        { status: 400 }
      );
    }

    await connectDB();

    let lead = null;
    if (leadId) {
      lead = await AiLead.findById(leadId).lean();
    }
    if (!lead && phone) {
      lead = await AiLead.findOne({ phone }).sort({ createdAt: -1 }).lean();
    }

    if (!lead) {
      return NextResponse.json({ conversation: [], leadId: null });
    }

    return NextResponse.json({
      conversation: (lead as any).conversation || [],
      leadId: (lead as any)._id.toString(),
      name: (lead as any).name,
      phone: (lead as any).phone,
    });
  } catch (err) {
    console.error("[chat/conversation] Error:", err);
    return NextResponse.json(
      { error: "Server error", conversation: [] },
      { status: 500 }
    );
  }
}
