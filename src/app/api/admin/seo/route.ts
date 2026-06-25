import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import SeoMeta from "@/models/SeoMeta";
import { requireAdminDb, ok, fail, notFound, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    path: z
        .string()
        .min(1)
        .max(300)
        .transform((v) => v.toLowerCase()),
    title: z.string().min(1).max(300),
    description: z.string().min(1).max(500),
    keywords: z.string().optional(),
    ogImage: z.string().optional(),
    ogType: z.string().default("website"),
    twitterCard: z.string().default("summary_large_image"),
    canonical: z.string().optional(),
    robots: z.string().default("index, follow"),
});

export async function GET(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const { searchParams } = new URL(req.url);
        const path = searchParams.get("path");
        await connectDB();
        if (path) {
            const doc = await SeoMeta.findOne({ path: path.toLowerCase() }).lean();
            if (!doc) return notFound();
            return ok({ ...doc, _id: doc._id.toString() });
        }
        const items = await SeoMeta.find({}).sort({ path: 1 }).lean();
        return ok({ items: items.map((d) => ({ ...d, _id: d._id.toString() })) });
    } catch (err) {
        return serverError(err);
    }
}

export async function POST(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const body = await req.json().catch(() => ({}));
        const parsed = schema.safeParse(body);
        if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid input", 400);
        await connectDB();
        const doc = await SeoMeta.findOneAndUpdate({ path: parsed.data.path }, parsed.data, {
            upsert: true,
            new: true,
        }).lean();
        revalidateSite(TAGS.SEO);
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
        const doc = await SeoMeta.findByIdAndUpdate(id, rest, { new: true }).lean();
        if (!doc) return notFound();
        revalidateSite(TAGS.SEO);
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
        const r = await SeoMeta.findByIdAndDelete(id).lean();
        if (!r) return notFound();
        revalidateSite(TAGS.SEO);
        return ok({ success: true });
    } catch (err) {
        return serverError(err);
    }
}
