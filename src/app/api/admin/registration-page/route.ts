import { connectDB } from "@/lib/mongodb";
import RegistrationCms from "@/models/RegistrationCms";
import { requireAdminDb, ok, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        await connectDB();
        let doc = await RegistrationCms.findOne({}).lean();
        if (!doc) {
            const created = await RegistrationCms.create({});
            doc = created.toObject();
        }
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
        if (typeof body !== "object" || body === null) {
            return ok({ error: "Invalid body" }, { status: 400 });
        }
        await connectDB();
        const doc = await RegistrationCms.findOneAndUpdate(
            {},
            { $set: body },
            { new: true, upsert: true }
        ).lean();
        revalidateSite(TAGS.REGISTRATION);
        return ok({ ...doc, _id: (doc as any)._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}