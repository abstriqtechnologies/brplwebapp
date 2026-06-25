import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import SitePage, { SITE_PAGE_KEYS, type SitePageKey } from "@/models/SitePage";
import { requireAdminDb, ok, fail, notFound, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    title: z.string().min(1).max(300),
    subtitle: z.string().optional(),
    body: z.string().optional(),
    heroImage: z.string().optional(),
    heroImageMobile: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    meta: z.record(z.string(), z.any()).optional(),
    order: z.number().int().optional(),
});

function isValidKey(k: string): k is SitePageKey {
    return (SITE_PAGE_KEYS as readonly string[]).includes(k);
}

export async function GET(_req: Request, { params }: { params: { key: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!isValidKey(params.key)) return notFound("Unknown page key");
        await connectDB();
        const doc = await SitePage.findOne({ key: params.key }).lean();
        if (!doc) {
            const created = await SitePage.create({
                key: params.key,
                title: defaultTitleFor(params.key),
            });
            return ok({ ...created.toObject(), _id: created._id.toString() });
        }
        return ok({ ...doc, _id: doc._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}

export async function PATCH(req: Request, { params }: { params: { key: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!isValidKey(params.key)) return fail("Unknown page key", 400);
        const body = await req.json().catch(() => ({}));
        const parsed = schema.safeParse(body);
        if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid input", 400);
        await connectDB();
        const doc = await SitePage.findOneAndUpdate(
            { key: params.key },
            { ...parsed.data, key: params.key },
            { upsert: true, new: true },
        ).lean();
        revalidateSite();
        return ok({ ...doc, _id: (doc as any)._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}

function defaultTitleFor(key: SitePageKey): string {
    const map: Record<SitePageKey, string> = {
        "about-us": "About Us",
        teams: "Teams",
        career: "Career",
        "contact-us": "Contact Us",
        "events-page": "Events",
        partners: "Partners",
        "registration-page": "Registration",
        "types-of-partners": "Types of Partners",
        "blog-index": "Blog",
        "news-index": "News",
        "privacy-page": "Privacy Policy",
        "terms-page": "Terms & Conditions",
        "rule-book": "Rule Book",
        "faqs-page": "FAQs",
    };
    return map[key] || key;
}
