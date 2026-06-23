import SiteSettings from "@/models/SiteSettings";
import { requireAdminDb, ok, serverError } from "@/lib/adminApi";
import { connectDB } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        await connectDB();
        let doc = await SiteSettings.findOne({}).lean();
        if (!doc) {
            const created = await SiteSettings.create({
                siteName: "Beyond Reach Premier League",
            });
            doc = created.toObject();
        }
        return ok({
            contactEmail: doc.contactEmail,
            contactPhone: doc.contactPhone,
            address: doc.address,
            socials: doc.socials,
        });
    } catch (err) {
        return serverError(err);
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const body = await req.json().catch(() => ({}));
        await connectDB();
        const doc = await SiteSettings.findOne({});
        if (!doc) {
            const created = await SiteSettings.create({
                siteName: "Beyond Reach Premier League",
                ...body,
            });
            return ok({ ...created.toObject(), _id: created._id.toString() });
        }
        for (const k of ["contactEmail", "contactPhone", "address", "socials"]) {
            if (k in body) (doc as any)[k] = (body as any)[k];
        }
        await doc.save();
        return ok({ ...doc.toObject(), _id: doc._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}