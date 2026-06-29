/**
 * `/api/admin/settings/seo/pages` — manage per-page SEO overrides.
 *
 *   GET  /api/admin/settings/seo/pages  → list all pages with their SEO meta
 *   PATCH /api/admin/settings/seo/pages → upsert SEO meta for a single path
 *
 * Auth: superadmin.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import SeoMeta from "@/models/SeoMeta";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError } from "@/lib/api/errors";
import { getAdminCookie } from "@/lib/auth/cookies";
import { revalidateSite, TAGS } from "@/lib/revalidate";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

const upsertSchema = z.object({
    path: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(300),
    keywords: z.string().trim().max(500).optional(),
    ogTitle: z.string().trim().max(120).optional(),
    ogDescription: z.string().trim().max(300).optional(),
    ogImage: z.string().trim().max(500).optional(),
    customHeadScripts: z.string().optional(),
});

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async () => {
        await connectDB();
        const docs = await SeoMeta.find({}).sort({ path: 1 }).lean();
        return ok({
            pages: docs.map((d) => ({
                path: d.path,
                title: d.title,
                description: d.description,
                keywords: d.keywords ?? "",
                ogTitle: d.ogTitle ?? "",
                ogDescription: d.ogDescription ?? "",
                ogImage: d.ogImage ?? "",
                customHeadScripts: d.customHeadScripts ?? "",
            })),
        });
    }),
);

export const PATCH = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        const body = await req.json().catch(() => ({}));
        const parsed = upsertSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", {
                details: parsed.error.issues,
            });
        }
        const { path, ...fields } = parsed.data;

        await connectDB();
        await SeoMeta.findOneAndUpdate(
            { path },
            { $set: fields },
            { upsert: true, new: true },
        );

        revalidateSite(TAGS.SEO);

        return ok({ saved: true, path });
    }),
);
