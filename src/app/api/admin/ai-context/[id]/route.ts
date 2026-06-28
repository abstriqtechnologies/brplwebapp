// src/app/api/admin/ai-context/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiContext from "@/models/AiContext";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { title, content, isActive } = await req.json();
    await connectDB();
    const context = await AiContext.findByIdAndUpdate(
      params.id,
      { title, content, isActive },
      { new: true }
    );
    if (!context) {
      return NextResponse.json(
        { error: "Context not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ context });
  } catch (error) {
    console.error("Error updating AI context:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const context = await AiContext.findByIdAndDelete(params.id);
    if (!context) {
      return NextResponse.json(
        { error: "Context not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting AI context:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
