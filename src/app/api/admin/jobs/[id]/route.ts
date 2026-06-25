import { z } from "zod";
import Job from "@/models/Job";
import { buildCrudRoutes } from "@/lib/adminCrud";

const schema = z.object({
    title: z.string().min(1).max(200),
    department: z.string().min(1).max(100),
    location: z.string().min(1).max(200),
    type: z.enum(["full-time", "part-time", "contract", "internship"]).default("full-time"),
    description: z.string().min(1),
    requirements: z.string().optional(),
    applyBy: z.string().datetime().or(z.string()).optional(),
    active: z.boolean().default(true),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { getOne, update, remove } = buildCrudRoutes(() => Job, schema);
export { getOne as GET, update as PATCH, remove as DELETE };
