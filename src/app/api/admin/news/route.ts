import { z } from "zod";
import NewsArticle from "@/models/NewsArticle";
import { buildCrudRoutes } from "@/lib/adminCrud";

const schema = z.object({
    title: z.string().min(1).max(300),
    slug: z
        .string()
        .min(1)
        .max(300)
        .transform((v) => v.toLowerCase()),
    summary: z.string().optional(),
    content: z.string().min(1),
    heroImage: z.string().optional(),
    featuredImage: z.string().optional(),
    metaTitle: z.string().max(300).optional(),
    metaDescription: z.string().max(1000).optional(),
    enableSchema: z.boolean().default(true),
    isPublished: z.boolean().default(true),
    source: z.string().optional(),
    sourceUrl: z.string().optional(),
    tags: z.array(z.string()).optional(),
    publishedAt: z.string().datetime().or(z.string()).optional(),
    draft: z.boolean().default(false),
    views: z.number().int().min(0).default(0),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { list, create } = buildCrudRoutes(() => NewsArticle, schema, {
    searchFields: ["title", "summary", "source"],
});
export { list as GET, create as POST };
