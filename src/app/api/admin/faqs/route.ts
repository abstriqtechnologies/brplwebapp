import { z } from "zod";
import FAQ from "@/models/FAQ";
import { buildCrudRoutes } from "@/lib/adminCrud";

const schema = z.object({
    question: z.string().min(1).max(500),
    answer: z.string().min(1),
    category: z.string().default("general"),
    order: z.number().int().default(0),
    active: z.boolean().default(true),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { list, create } = buildCrudRoutes(() => FAQ, schema, {
    searchFields: ["question", "answer", "category"],
});
export { list as GET, create as POST };