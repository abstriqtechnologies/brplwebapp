import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireAdminDb, ok, fail, notFound, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";
import { deleteUpload } from "@/lib/mediaStorage";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
    folder: z.string().optional(),
    originalName: z.string().min(1).max(300).optional(),
    tags: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
        const body = await req.json().catch(() => ({}));
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid input", 400);

        await connectDB();
        const doc = await Media.findByIdAndUpdate(params.id, parsed.data, { returnDocument: "after" }).lean();
        if (!doc) return notFound();
        revalidateSite(TAGS.MEDIA);
        return ok({ ...doc, _id: doc._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();

        await connectDB();
        const doc = await Media.findById(params.id).lean();
        if (!doc) return notFound();

        await deleteUpload(doc.url);
        // Also try to delete the webp sibling if present
        if (doc.kind === "image") {
            const webpUrl = doc.url.replace(/\.[^.]+$/, ".webp");
            await deleteUpload(webpUrl);
        }

        await Media.findByIdAndDelete(params.id);
        revalidateSite(TAGS.MEDIA);
        return ok({ success: true });
    } catch (err) {
        return serverError(err);
    }
}
