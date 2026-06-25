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
    source: z.string().optional(),
    sourceUrl: z.string().optional(),
    tags: z.array(z.string()).optional(),
    publishedAt: z.string().datetime().or(z.string()).optional(),
    draft: z.boolean().default(true),
    views: z.number().int().min(0).default(0),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { getOne, update, remove } = buildCrudRoutes(() => NewsArticle, schema);
export { getOne as GET, update as PATCH, remove as DELETE };
