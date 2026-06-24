import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import NewsArticle from "@/models/NewsArticle";
import { serializePost } from "@/lib/serializePost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectDB();
        const docs = await NewsArticle.find({ draft: { $ne: true } })
            .sort({ publishedAt: -1, createdAt: -1 })
            .lean();
        return NextResponse.json({
            success: true,
            data: docs.map(serializePost),
        });
    } catch (err: any) {
        console.error("[api/news]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
