/**
 * `/api/admin/pages/[key]` — admin read/update for a single site page.
 *
 *   GET   /api/admin/pages/[key]
 *   PATCH /api/admin/pages/[key]
 *
 * Auth: superadmin.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import SitePage from "@/models/SitePage";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError } from "@/lib/api/errors";
import { getAdminCookie } from "@/lib/auth/cookies";
import { PAGE_REGISTRY } from "@/lib/pageRegistry";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

const sectionSchema = z.object({
    _id: z.string().optional().default(""),
    type: z.string().min(1),
    order: z.number().int().min(0),
    title: z.string().optional().default(""),
    subtitle: z.string().optional().default(""),
    description: z.string().optional().default(""),
    image: z.string().optional().default(""),
    imageMobile: z.string().optional().default(""),
    videoUrl: z.string().optional().default(""),
    ctaText: z.string().optional().default(""),
    ctaLink: z.string().optional().default(""),
    data: z.record(z.any()).optional(),
    active: z.boolean().default(true),
});

const updateSchema = z.object({
    title: z.string().trim().min(1).optional(),
    subtitle: z.string().optional(),
    sections: z.array(sectionSchema).optional(),
    meta: z
        .object({
            title: z.string().optional(),
            description: z.string().optional(),
            keywords: z.string().optional(),
        })
        .optional(),
});

function generateTemplatePage(key: string) {
    const config = PAGE_REGISTRY[key];
    if (!config) return null;

    return {
        key,
        title: config.label,
        sections: config.sections.map((sc, i) => ({
            _id: `new-${sc.type}-${i}`,
            type: sc.type,
            order: i,
            title: sc.label,
            subtitle: "",
            description: "",
            image: "",
            imageMobile: "",
            videoUrl: "",
            ctaText: "",
            ctaLink: "",
            active: true,
        })),
        meta: {
            title: "",
            description: "",
            keywords: "",
        },
    };
}

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }: { req: Request }) => {
        await connectDB();
        // Next.js App Router: extract [key] from URL pathname
        const url = new URL(req.url);
        const segments = url.pathname.split("/").filter(Boolean);
        const key = (segments[segments.length - 1] || "").toLowerCase().trim();
        const config = PAGE_REGISTRY[key];
        if (!config) throw new BadRequestError(`Unknown page key: ${key}`);

        const page = await SitePage.findOne({ key }).lean();

        // If no DB entry yet, return registry config as template
        if (!page) {
            return ok({
                page: generateTemplatePage(key),
            });
        }

        return ok({ page });
    }),
);

export const PATCH = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }: { req: Request }) => {
        await connectDB();
        // Next.js App Router: extract [key] from URL pathname
        const url = new URL(req.url);
        const segments = url.pathname.split("/").filter(Boolean);
        const key = (segments[segments.length - 1] || "").toLowerCase().trim();
        const config = PAGE_REGISTRY[key];
        if (!config) throw new BadRequestError(`Unknown page key: ${key}`);

        const body = await req.json().catch(() => ({}));
        const parsed = updateSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }

        const data = parsed.data;

        // Validate section types against registry
        if (data.sections) {
            const allowedTypes = new Set(config.sections.map((s) => s.type));
            for (const section of data.sections) {
                if (!allowedTypes.has(section.type)) {
                    throw new BadRequestError(
                        `Section type "${section.type}" not allowed for page "${key}". Allowed: ${Array.from(allowedTypes).join(", ")}`,
                    );
                }
            }
        }

        const page = await SitePage.findOneAndUpdate(
            { key },
            { $set: { ...data, key } },
            { upsert: true, new: true },
        ).lean();

        return ok({ page });
    }),
);
