import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import PageBanner from "@/models/PageBanner";
import { requireAdminDb, ok, fail, notFound, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    key: z.string().min(1).max(100),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    image: z.string().optional(),
    imageMobile: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    active: z.boolean().default(true),
});

export async function GET(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const { searchParams } = new URL(req.url);
        const key = searchParams.get("key");
        await connectDB();
        if (key) {
            const doc = await PageBanner.findOne({ key: key.toLowerCase() }).lean();
            if (!doc) return notFound("Banner not found");
            return ok({ ...doc, _id: doc._id.toString() });
        }
        const items = await PageBanner.find({}).sort({ key: 1 }).lean();
        return ok({
            items: items.map((d) => ({ ...d, _id: d._id.toString() })),
        });
    } catch (err) {
        return serverError(err);
    }
}

export async function POST(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const body = await req.json().catch(() => ({}));
        const parsed = schema.safeParse({
            ...body,
            key: (body.key || "").toLowerCase(),
        });
        if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid input", 400);
        await connectDB();
        const doc = await PageBanner.findOneAndUpdate({ key: parsed.data.key }, parsed.data, {
            upsert: true,
            new: true,
        }).lean();
        revalidateSite(TAGS.PAGE_BANNERS);
        return ok({ ...doc, _id: (doc as any)._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const body = await req.json().catch(() => ({}));
        const { id, ...rest } = body as { id?: string } & Record<string, unknown>;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return fail("Invalid id", 400);
        await connectDB();
        const doc = await PageBanner.findByIdAndUpdate(id, rest, { new: true }).lean();
        if (!doc) return notFound();
        revalidateSite(TAGS.PAGE_BANNERS);
        return ok({ ...doc, _id: doc._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return fail("Invalid id", 400);
        await connectDB();
        const r = await PageBanner.findByIdAndDelete(id).lean();
        if (!r) return notFound();
        revalidateSite(TAGS.PAGE_BANNERS);
        return ok({ success: true });
    } catch (err) {
        return serverError(err);
    }
}
