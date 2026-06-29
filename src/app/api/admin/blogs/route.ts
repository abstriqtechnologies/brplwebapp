/**
 * `/api/admin/blogs` — admin CRUD list/create for blog posts.
 *
 *   GET  /api/admin/blogs?search=&page=&pageSize=
 *   POST /api/admin/blogs
 *
 * Auth: superadmin.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import BlogPost from "@/models/BlogPost";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError, ConflictError } from "@/lib/api/errors";
import { getAdminCookie } from "@/lib/auth/cookies";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

const listQuerySchema = z.object({
    search: z.string().trim().max(64).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

const createSchema = z.object({
    title: z.string().trim().min(1).max(200),
    slug: z.string().trim().min(1).max(200),
    excerpt: z.string().trim().max(500).optional(),
    content: z.string(),
    heroImage: z.string().optional().or(z.literal("")),
    featuredImage: z.string().optional().or(z.literal("")),
    tags: z.array(z.string().trim()).optional(),
    authorName: z.string().trim().max(100).optional(),
    metaTitle: z.string().trim().max(200).optional(),
    metaDescription: z.string().trim().max(500).optional(),
    enableSchema: z.boolean().default(true),
    draft: z.boolean().default(true),
});

type BlogDoc = {
    _id: unknown;
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    heroImage?: string;
    featuredImage?: string;
    tags?: string[];
    authorName?: string;
    metaTitle?: string;
    metaDescription?: string;
    enableSchema?: boolean;
    draft: boolean;
    views: number;
    publishedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

function serializeBlog(doc: BlogDoc) {
    return {
        id: String(doc._id),
        title: doc.title,
        slug: doc.slug,
        excerpt: doc.excerpt ?? "",
        content: doc.content,
        heroImage: doc.heroImage ?? "",
        featuredImage: doc.featuredImage ?? "",
        tags: doc.tags ?? [],
        authorName: doc.authorName ?? "",
        metaTitle: doc.metaTitle ?? "",
        metaDescription: doc.metaDescription ?? "",
        enableSchema: doc.enableSchema ?? true,
        draft: doc.draft,
        views: doc.views,
        publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const url = new URL(req.url);
        const parsed = listQuerySchema.safeParse({
            search: url.searchParams.get("search") ?? undefined,
            page: url.searchParams.get("page") ?? undefined,
            pageSize: url.searchParams.get("pageSize") ?? undefined,
        });
        if (!parsed.success) throw new BadRequestError("Invalid query");
        const { search, page, pageSize } = parsed.data;

        const query: Record<string, unknown> = {};
        if (search?.trim()) {
            const regex = { $regex: escapeRegex(search.trim()), $options: "i" };
            query.$or = [{ title: regex }, { excerpt: regex }, { tags: regex }, { authorName: regex }];
        }

        const [blogs, total] = await Promise.all([
            BlogPost.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            BlogPost.countDocuments(query),
        ]);

        return ok({
            blogs: (blogs as unknown as BlogDoc[]).map(serializeBlog),
            total,
            page,
            pageSize,
        });
    }),
);

export const POST = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const body = await req.json().catch(() => ({}));
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }
        const data = parsed.data;

        const publishedAt = data.draft ? undefined : new Date();

        try {
            const blog = await BlogPost.create({
                title: data.title,
                slug: data.slug,
                excerpt: data.excerpt,
                content: data.content,
                heroImage: data.heroImage,
                featuredImage: data.featuredImage,
                tags: data.tags,
                authorName: data.authorName,
                metaTitle: data.metaTitle,
                metaDescription: data.metaDescription,
                enableSchema: data.enableSchema,
                draft: data.draft,
                publishedAt,
            });

            return ok({ blog: serializeBlog(blog.toObject() as BlogDoc) });
        } catch (err) {
            const e = err as { code?: number };
            if (e?.code === 11000) {
                throw new ConflictError(`A blog post with slug "${data.slug}" already exists`);
            }
            throw err;
        }
    }),
);

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
