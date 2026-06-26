import { connectDB } from "@/lib/mongodb";
import HomeCms from "@/models/HomeCms";
import { requireAdminDb, ok, fail, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";

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
        if (section === "banners") {
            // Return all home-page sections so the admin can pre-populate trustBar and
            // broadcastingPartners without an extra round-trip.
            return ok({
                section,
                data: {
                    banners: (doc as any).banners ?? [],
                    trustBar: (doc as any).trustBar ?? [],
                    broadcastingPartners: (doc as any).broadcastingPartners ?? [],
                },
            });
        }
        return ok({
            section,
            data: field ? ((doc as any)[field] ?? {}) : null,
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

        if (section === "banners") {
            // The banners admin page PATCHes all three home-page arrays in one call.
            // Accept any of { banners, trustBar, broadcastingPartners } and merge each
            // into the corresponding top-level field on the HomeCms doc.
            if (Array.isArray((body as any).banners)) update.banners = (body as any).banners;
            if (Array.isArray((body as any).trustBar)) update.trustBar = (body as any).trustBar;
            if (Array.isArray((body as any).broadcastingPartners))
                update.broadcastingPartners = (body as any).broadcastingPartners;
            // Backward compat: a plain array body is treated as the banners field.
            if (Array.isArray(body) && !update.banners) update.banners = body;
        } else {
            update[field] = body;
        }

        if (Object.keys(update).length === 0) {
            return fail("No recognized fields in body", 400);
        }

        const doc = await HomeCms.findOneAndUpdate({}, { $set: update }, { returnDocument: "after", upsert: true }).lean();
        revalidateSite(TAGS.HOME);
        return ok({
            section,
            data: {
                banners: (doc as any).banners ?? [],
                trustBar: (doc as any).trustBar ?? [],
                broadcastingPartners: (doc as any).broadcastingPartners ?? [],
            },
        });
    } catch (err) {
        return serverError(err);
    }
}
