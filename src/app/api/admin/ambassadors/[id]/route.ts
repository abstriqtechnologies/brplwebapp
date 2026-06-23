import { z } from "zod";
import Ambassador from "@/models/Ambassador";
import { buildCrudRoutes } from "@/lib/adminCrud";

const schema = z.object({
    name: z.string().min(1).max(200),
    image: z.string().optional(),
    bio: z.string().optional(),
    designation: z.string().optional(),
    city: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    active: z.boolean().default(true),
    order: z.number().int().default(0),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { getOne, update, remove } = buildCrudRoutes(() => Ambassador, schema);
export { getOne as GET, update as PATCH, remove as DELETE };