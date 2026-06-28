// src/app/api/admin/ai-context/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiContext from "@/models/AiContext";

export async function GET() {
  try {
    await connectDB();
    const contexts = await AiContext.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ contexts });
  } catch (error) {
    console.error("Error fetching AI contexts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, content, isActive } = await req.json();
    if (!title || !content) {
      return NextResponse.json(
        { error: "title and content are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const context = await AiContext.create({ title, content, isActive });
    return NextResponse.json({ context }, { status: 201 });
  } catch (error) {
    console.error("Error creating AI context:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
