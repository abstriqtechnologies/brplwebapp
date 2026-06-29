/**
 * `/api/admin/legal/terms` — admin terms-and-conditions page operations.
 *
 *   GET   /api/admin/legal/terms   — fetch the terms page
 *   PATCH /api/admin/legal/terms   — update title, content, version, effectiveDate
 *
 * Auth: superadmin.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import LegalPage from "@/models/LegalPage";
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

const patchSchema = z.object({
    title: z.string().trim().min(1).optional(),
    content: z.string().optional(),
    version: z.string().trim().min(1).optional(),
    effectiveDate: z.string().datetime().optional().or(z.literal("")),
});

type LegalDoc = {
    _id: unknown;
    type: "privacy" | "terms" | "rulebook";
    title: string;
    content: string;
    version: string;
    effectiveDate?: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

function serializeLegal(doc: LegalDoc) {
    return {
        id: String(doc._id),
        type: doc.type,
        title: doc.title,
        content: doc.content,
        version: doc.version,
        effectiveDate: doc.effectiveDate ? doc.effectiveDate.toISOString() : null,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async () => {
        await connectDB();
        const doc = await LegalPage.findOne({ type: "terms" }).lean();
        if (!doc) {
            return ok({
                legalPage: {
                    id: "",
                    type: "terms",
                    title: "",
                    content: "",
                    version: "",
                    effectiveDate: null,
                    createdAt: "",
                    updatedAt: "",
                },
            });
        }
        return ok({ legalPage: serializeLegal(doc as unknown as LegalDoc) });
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

        const patch: Record<string, unknown> = { ...data };
        if (data.effectiveDate !== undefined) {
            patch.effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : null;
        }

        const updated = await LegalPage.findOneAndUpdate(
            { type: "terms" },
            { $set: patch },
            { returnDocument: "after", upsert: true, new: true },
        ).lean();

        revalidateSite(TAGS.LEGAL);

        return ok({ legalPage: serializeLegal(updated as unknown as LegalDoc) });
    }),
);
