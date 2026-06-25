import { connectDB } from "@/lib/mongodb";
import RegistrationCms from "@/models/RegistrationCms";
import { requireAdminDb, ok, fail, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECTIONS = [
    "videos",
    "numbers-speak",
    "roadmap",
    "zone-deadline",
    "player-stories",
    "faqs",
    "hero",
    "banner",
] as const;
type Section = (typeof SECTIONS)[number];

function getFieldFor(section: Section): string | null {
    switch (section) {
        case "videos":
            return "videos";
        case "numbers-speak":
            return "numbersSpeak";
        case "roadmap":
            return "roadmap";
        case "zone-deadline":
            return "zoneDeadlines";
        case "player-stories":
            return "playerStories";
        case "faqs":
            return "registrationFaqs";
        case "hero":
            return "hero";
        case "banner":
            return "banner";
    }
}

export async function GET(_req: Request, { params }: { params: { section: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const section = params.section as Section;
        if (!SECTIONS.includes(section)) return fail("Invalid section", 400);
        const field = getFieldFor(section);
        if (!field) return fail("Invalid section", 400);

        await connectDB();
        let doc = await RegistrationCms.findOne({}).lean();
        if (!doc) {
            const created = await RegistrationCms.create({});
            doc = created.toObject();
        }
        return ok({ section, data: (doc as any)[field] });
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
        const update: Record<string, unknown> = { [field]: body };
        const doc = await RegistrationCms.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true }).lean();
        revalidateSite(TAGS.REGISTRATION);
        return ok({ section, data: (doc as any)[field] });
    } catch (err) {
        return serverError(err);
    }
}
