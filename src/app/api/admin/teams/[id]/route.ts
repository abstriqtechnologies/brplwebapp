import { z } from "zod";
import TeamMember from "@/models/TeamMember";
import { buildCrudRoutes } from "@/lib/adminCrud";

const schema = z.object({
    name: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    image: z.string().optional(),
    bio: z.string().optional(),
    department: z.string().optional(),
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    email: z.string().email().optional(),
    order: z.number().int().default(0),
    active: z.boolean().default(true),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { getOne, update, remove } = buildCrudRoutes(() => TeamMember, schema);
export { getOne as GET, update as PATCH, remove as DELETE };