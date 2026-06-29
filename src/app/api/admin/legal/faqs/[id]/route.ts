/**
 * `/api/admin/legal/faqs/[id]` — single-FAQ admin operations.
 *
 *   GET    /api/admin/legal/faqs/[id]   — fetch single FAQ
 *   PATCH  /api/admin/legal/faqs/[id]   — partial update
 *   DELETE /api/admin/legal/faqs/[id]   — hard delete
 *
 * Auth: superadmin.
 *
 * NOTE: `withRequest` doesn't forward Next.js route params, so we extract
 * `id` from the URL path here. This matches the rest of the
 * `withRequest`-wrapped routes in the codebase.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import FAQ from "@/models/FAQ";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
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

/** Pull the last non-empty path segment (the dynamic id) from the request URL. */
function extractId(req: Request): string {
    return new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
}

const patchSchema = z.object({
    question: z.string().trim().min(1).optional(),
    answer: z.string().min(1).optional(),
    category: z.string().trim().max(64).optional(),
    order: z.number().int().optional(),
    active: z.boolean().optional(),
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

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const faq = await FAQ.findById(extractId(req)).lean();
        if (!faq) throw new NotFoundError("FAQ not found");
        return ok({ faq: serializeFAQ(faq as unknown as FAQDoc) });
    }),
);

export const PATCH = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const body = await req.json().catch(() => ({}));
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }
        const data = parsed.data;

        const updated = await FAQ.findByIdAndUpdate(extractId(req), data, { returnDocument: "after" }).lean();
        if (!updated) throw new NotFoundError("FAQ not found");

        revalidateSite(TAGS.LEGAL);

        return ok({ faq: serializeFAQ(updated as unknown as FAQDoc) });
    }),
);

export const DELETE = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const deleted = await FAQ.findByIdAndDelete(extractId(req)).lean();
        if (!deleted) throw new NotFoundError("FAQ not found");

        revalidateSite(TAGS.LEGAL);

        return ok({ deleted: true });
    }),
);
