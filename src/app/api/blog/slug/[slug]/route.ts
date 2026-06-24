import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    try {
        await connectDB();
        const doc = await BlogPost.findOne({ slug: params.slug.toLowerCase(), draft: { $ne: true } }).lean();
        if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: { ...doc, _id: doc._id.toString() } });
    } catch (err: any) {
        console.error("[api/blog/slug]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
