import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Ambassador from "@/models/Ambassador";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    try {
        await connectDB();
        const query = mongoose.Types.ObjectId.isValid(params.id)
            ? { _id: params.id }
            : { _id: new mongoose.Types.ObjectId() }; // always miss
        const doc = await Ambassador.findOne(query).lean();
        if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: { ...doc, _id: doc._id.toString() } });
    } catch (err: any) {
        console.error("[api/ambassadors/id]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
