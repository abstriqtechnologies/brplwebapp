import { connectDB } from "@/lib/mongodb";
import AboutCms from "@/models/AboutCms";
import { requireAdminDb, ok, fail, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECTIONS = ["banner", "about-brpl", "mission-vision", "meet-our-team"] as const;
type Section = (typeof SECTIONS)[number];

function getFieldFor(section: Section): string | null {
    switch (section) {
        case "banner":
            return "banner";
        case "about-brpl":
            return "aboutBrpl";
        case "mission-vision":
            return "missionVision";
        case "meet-our-team":
            return "meetOurTeam";
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
        let doc = await AboutCms.findOne({}).lean();
        if (!doc) {
            const created = await AboutCms.create({});
            doc = created.toObject();
        }
        return ok({
            section,
            data: field ? ((doc as any)[field] ?? {}) : {},
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
        if (typeof body !== "object" || body === null) return fail("Invalid body", 400);

        await connectDB();
        const update: Record<string, unknown> = {};
        update[field] = body;
        const doc = await AboutCms.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true }).lean();
        revalidateSite(TAGS.ABOUT);
        return ok({ section, data: (doc as any)[field] });
    } catch (err) {
        return serverError(err);
    }
}
