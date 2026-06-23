import { connectDB } from "@/lib/mongodb";
import HomeCms from "@/models/HomeCms";
import { requireAdminDb, ok, fail, serverError } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECTIONS = ["banners", "who-we-are"] as const;
type Section = (typeof SECTIONS)[number];

function getFieldFor(section: Section): string | null {
    switch (section) {
        case "banners":
            return "banners";
        case "who-we-are":
            return "whoWeAre";
    }
}

export async function GET(_req: Request, { params }: { params: { section: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const section = params.section as Section;
        if (!SECTIONS.includes(section)) return fail("Invalid section", 400);
        const field = getFieldFor(section);

        await connectDB();
        let doc = await HomeCms.findOne({}).lean();
        if (!doc) {
            const created = await HomeCms.create({});
            doc = created.toObject();
        }
        return ok({
            section,
            data: field ? (doc as any)[field] ?? (section === "banners" ? [] : {}) : null,
        });
    } catch (err) {
        return serverError(err);
    }
}

export async function PATCH(req: Request, { params }: { params: { section: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const section = params.section as Section;
        if (!SECTIONS.includes(section)) return fail("Invalid section", 400);
        const field = getFieldFor(section);
        if (!field) return fail("Invalid section", 400);

        const body = await req.json().catch(() => ({}));
        await connectDB();
        const update: Record<string, unknown> = {};
        update[field] = body;
        const doc = await HomeCms.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true }).lean();
        return ok({ section, data: (doc as any)[field] });
    } catch (err) {
        return serverError(err);
    }
}