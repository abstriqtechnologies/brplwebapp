import { z } from "zod";
import BlogPost from "@/models/BlogPost";
import { buildCrudRoutes } from "@/lib/adminCrud";

const schema = z.object({
    title: z.string().min(1).max(300),
    slug: z.string().min(1).max(300).transform((v) => v.toLowerCase()),
    excerpt: z.string().optional(),
    content: z.string().min(1),
    heroImage: z.string().optional(),
    featuredImage: z.string().optional(),
    metaTitle: z.string().max(300).optional(),
    metaDescription: z.string().max(1000).optional(),
    enableSchema: z.boolean().default(true),
    isPublished: z.boolean().default(true),
    tags: z.array(z.string()).optional(),
    authorName: z.string().optional(),
    authorImage: z.string().optional(),
    publishedAt: z.string().datetime().or(z.string()).optional(),
    draft: z.boolean().default(false),
    views: z.number().int().min(0).default(0),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { list, create } = buildCrudRoutes(() => BlogPost, schema, {
    searchFields: ["title", "excerpt"],
});
export { list as GET, create as POST };