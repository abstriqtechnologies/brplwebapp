/**
 * `/api/admin/legal/faqs` — admin FAQ list/create.
 *
 *   GET  /api/admin/legal/faqs?search=&page=&pageSize=&category=
 *   POST /api/admin/legal/faqs
 *
 * Auth: superadmin.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import FAQ from "@/models/FAQ";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError } from "@/lib/api/errors";
import { getAdminCookie } from "@/lib/auth/cookies";
import { TAGS, revalidateSite } from "@/lib/revalidate";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

const listQuerySchema = z.object({
    search: z.string().trim().max(128).optional(),
    category: z.string().trim().max(64).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

const createSchema = z.object({
    question: z.string().trim().min(1),
    answer: z.string().min(1),
    category: z.string().trim().max(64).default("general"),
    order: z.number().int().default(0),
    active: z.boolean().default(true),
});

type FAQDoc = {
    _id: unknown;
    question: string;
    answer: string;
    category: string;
    order: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
};

function serializeFAQ(doc: FAQDoc) {
    return {
        id: String(doc._id),
        question: doc.question,
        answer: doc.answer,
        category: doc.category,
        order: doc.order,
        active: doc.active,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const url = new URL(req.url);
        const parsed = listQuerySchema.safeParse({
            search: url.searchParams.get("search") ?? undefined,
            category: url.searchParams.get("category") ?? undefined,
            page: url.searchParams.get("page") ?? undefined,
            pageSize: url.searchParams.get("pageSize") ?? undefined,
        });
        if (!parsed.success) throw new BadRequestError("Invalid query");
        const { search, category, page, pageSize } = parsed.data;

        const query: Record<string, unknown> = {};
        if (category?.trim()) {
            query.category = category.trim();
        }
        if (search?.trim()) {
            const regex = { $regex: escapeRegex(search.trim()), $options: "i" };
            query.$or = [{ question: regex }, { answer: regex }];
        }

        const [faqs, total] = await Promise.all([
            FAQ.find(query)
                .sort({ order: 1, createdAt: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            FAQ.countDocuments(query),
        ]);

        return ok({
            faqs: (faqs as unknown as FAQDoc[]).map(serializeFAQ),
            total,
            page,
            pageSize,
        });
    }),
);

export const POST = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const body = await req.json().catch(() => ({}));
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }
        const data = parsed.data;

        const faq = await FAQ.create({
            question: data.question,
            answer: data.answer,
            category: data.category,
            order: data.order,
            active: data.active,
        });

        revalidateSite(TAGS.LEGAL);

        return ok({ faq: serializeFAQ(faq.toObject() as FAQDoc) });
    }),
);
