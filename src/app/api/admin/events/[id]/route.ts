import { z } from "zod";
import Event from "@/models/Event";
import { buildCrudRoutes } from "@/lib/adminCrud";

const schema = z.object({
    title: z.string().min(1).max(200),
    slug: z
        .string()
        .min(1)
        .max(200)
        .transform((v) => v.toLowerCase()),
    description: z.string().optional(),
    content: z.string().optional(),
    image: z.string().optional(),
    venue: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    startDate: z.string().datetime().or(z.string()),
    endDate: z.string().datetime().or(z.string()).optional(),
    status: z.enum(["upcoming", "live", "completed", "cancelled"]).default("upcoming"),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { getOne, update, remove } = buildCrudRoutes(() => Event, schema);
export { getOne as GET, update as PATCH, remove as DELETE };
