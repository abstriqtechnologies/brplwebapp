import { z } from "zod";
import Campaign from "@/models/Campaign";
import { buildCrudRoutes } from "@/lib/adminCrud";

const schema = z.object({
    name: z.string().min(1).max(200),
    slug: z
        .string()
        .min(1)
        .max(200)
        .transform((v) => v.toLowerCase()),
    description: z.string().optional(),
    qrCodeUrl: z.string().min(1).max(2000),
    targetUrl: z.string().optional(),
    hits: z.number().int().min(0).default(0),
    active: z.boolean().default(true),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { getOne, update, remove } = buildCrudRoutes(() => Campaign, schema);
export { getOne as GET, update as PATCH, remove as DELETE };
