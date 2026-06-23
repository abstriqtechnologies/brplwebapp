import { connectDB } from "@/lib/mongodb";
import { requireAdminDb, ok, fail, notFound, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS, type SiteTag } from "@/lib/revalidate";
import type { Model } from "mongoose";

/**
 * Build GET/PATCH handlers for a single-document CMS collection. The
 * document is fetched/upserted on first read.
 */
export function buildSingleDocHandlers<T>(
    getModel: () => Model<T>,
    defaultDoc: () => Partial<T> = () => ({}) as Partial<T>,
    revalidateTag: SiteTag = TAGS.ALL
) {
    async function GET() {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        await connectDB();
        const Model = getModel();
        let doc: any = await Model.findOne({}).lean();
        if (!doc) {
            const created = await Model.create(defaultDoc() as any);
            doc = created.toObject();
        }
        return ok({ ...doc, _id: doc._id?.toString() });
    }

    async function PATCH(req: Request) {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const body = await req.json().catch(() => ({}));
        if (typeof body !== "object" || body === null) return fail("Invalid body", 400);
        await connectDB();
        const Model = getModel();
        const existingDoc = await Model.findOne({});
        if (!existingDoc) {
            const created = await Model.create({ ...defaultDoc(), ...body } as any);
            revalidateSite(revalidateTag);
            return ok({ ...created.toObject(), _id: created._id.toString() });
        }
        Object.assign(existingDoc, body);
        await existingDoc.save();
        revalidateSite(revalidateTag);
        return ok({ ...existingDoc.toObject(), _id: existingDoc._id.toString() });
    }

    return { GET, PATCH };
}
