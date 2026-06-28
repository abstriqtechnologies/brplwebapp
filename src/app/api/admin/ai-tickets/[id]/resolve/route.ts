// src/app/api/admin/ai-tickets/[id]/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiTicket from "@/models/AiTicket";
import AiLead from "@/models/AiLead";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { resolvedBy } = await req.json();
    await connectDB();

    const ticket = await AiTicket.findByIdAndUpdate(
      params.id,
      {
        status: "resolved",
        resolvedAt: new Date(),
        resolvedBy: resolvedBy || "Admin",
      },
      { new: true }
    );

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Also update the associated lead status if exists
    if (ticket.leadId) {
      await AiLead.findByIdAndUpdate(ticket.leadId, { status: "resolved" });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Error resolving ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
