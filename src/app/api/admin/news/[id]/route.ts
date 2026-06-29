/**
 * `/api/admin/news/[id]` — single-news-article admin operations.
 *
 *   PATCH  /api/admin/news/[id]   — partial update
 *   DELETE /api/admin/news/[id]   — hard delete
 *
 * Auth: superadmin.
 *
 * NOTE: `withRequest` doesn't forward Next.js route params, so we extract
 * `id` from the URL path here. This matches the rest of the
 * `withRequest`-wrapped routes in the codebase.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import NewsArticle from "@/models/NewsArticle";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api/errors";
import { getAdminCookie } from "@/lib/auth/cookies";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

/** Pull the last non-empty path segment (the dynamic id) from the request URL. */
function extractId(req: Request): string {
    return new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
}

const patchSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    slug: z.string().trim().min(1).max(200).optional(),
    summary: z.string().trim().max(500).optional(),
    content: z.string().optional(),
    heroImage: z.string().optional().or(z.literal("")),
    featuredImage: z.string().optional().or(z.literal("")),
    tags: z.array(z.string().trim()).optional(),
    source: z.string().trim().max(200).optional(),
    sourceUrl: z.string().trim().max(500).optional(),
    metaTitle: z.string().trim().max(200).optional(),
    metaDescription: z.string().trim().max(500).optional(),
    enableSchema: z.boolean().optional(),
    draft: z.boolean().optional(),
});

function serializeNews(c: {
    _id: unknown;
    title: string;
    slug: string;
    summary?: string;
    content: string;
    heroImage?: string;
    featuredImage?: string;
    tags?: string[];
    source?: string;
    sourceUrl?: string;
    metaTitle?: string;
    metaDescription?: string;
    enableSchema?: boolean;
    draft: boolean;
    views: number;
    publishedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}) {
    return {
        id: String(c._id),
        title: c.title,
        slug: c.slug,
        summary: c.summary ?? "",
        content: c.content,
        heroImage: c.heroImage ?? "",
        featuredImage: c.featuredImage ?? "",
        tags: c.tags ?? [],
        source: c.source ?? "",
        sourceUrl: c.sourceUrl ?? "",
        metaTitle: c.metaTitle ?? "",
        metaDescription: c.metaDescription ?? "",
        enableSchema: c.enableSchema ?? true,
        draft: c.draft,
        views: c.views,
        publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
    };
}

export const PATCH = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const body = await req.json().catch(() => ({}));
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }
        const data = parsed.data;

        const patch: Record<string, unknown> = { ...data };

        // If draft is transitioning from true to false, set publishedAt if not already set.
        if (data.draft !== undefined && !data.draft) {
            const existing = await NewsArticle.findById(extractId(req)).lean();
            if (existing && !existing.publishedAt) {
                patch.publishedAt = new Date();
            }
        }

        try {
            const updated = await NewsArticle.findByIdAndUpdate(extractId(req), patch, { returnDocument: "after" }).lean();
            if (!updated) throw new NotFoundError("News article not found");
            return ok({ news: serializeNews(updated as typeof updated) });
        } catch (err) {
            const e = err as { code?: number; status?: number };
            if (e?.code === 11000) {
                throw new ConflictError("A news article with that slug already exists");
            }
            if (e?.status) throw err; // re-throw our own AppErrors
            throw err;
        }
    }),
);

export const DELETE = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const deleted = await NewsArticle.findByIdAndDelete(extractId(req)).lean();
        if (!deleted) throw new NotFoundError("News article not found");
        return ok({ deleted: true });
    }),
);
