import { z } from "zod";
import BlogPost from "@/models/BlogPost";
import { buildCrudRoutes } from "@/lib/adminCrud";

const schema = z.object({
    title: z.string().min(1).max(300),
    slug: z.string().min(1).max(300).transform((v) => v.toLowerCase()),
    excerpt: z.string().optional(),
    content: z.string().min(1),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).optional(),
    authorName: z.string().optional(),
    authorImage: z.string().optional(),
    publishedAt: z.string().datetime().or(z.string()).optional(),
    draft: z.boolean().default(true),
    views: z.number().int().min(0).default(0),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { getOne, update, remove } = buildCrudRoutes(() => BlogPost, schema);
export { getOne as GET, update as PATCH, remove as DELETE };