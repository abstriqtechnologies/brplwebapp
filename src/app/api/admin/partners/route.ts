import { z } from "zod";
import Partner from "@/models/Partner";
import { buildCrudRoutes } from "@/lib/adminCrud";

const schema = z.object({
    name: z.string().min(1).max(200),
    type: z.enum(["title", "broadcasting", "sponsor", "associate", "media"]).default("sponsor"),
    logo: z.string().optional(),
    website: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["new", "approved", "rejected", "active"]).default("new"),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    message: z.string().optional(),
    order: z.number().int().default(0),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { list, create } = buildCrudRoutes(() => Partner, schema, {
    searchFields: ["name", "contactName", "contactEmail"],
});
export { list as GET, create as POST };