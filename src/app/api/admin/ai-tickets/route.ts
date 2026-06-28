// src/app/api/admin/ai-tickets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiTicket from "@/models/AiTicket";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    await connectDB();

    const filter: any = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const [tickets, total] = await Promise.all([
      AiTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AiTicket.countDocuments(filter),
    ]);

    return NextResponse.json({
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
