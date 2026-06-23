import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAdminDb, ok, fail, notFound, serverError, hasRole } from "@/lib/adminApi";
import type { Model } from "mongoose";

/**
 * Build the standard collection-CRUD route handlers for a simple admin
 * resource. Pass the mongoose model and a Zod schema for `create`/`update`
 * (same shape). Returns a Record<HttpMethod, handler>.
 */
export function buildCrudRoutes<T extends { _id: any; createdAt?: Date; updatedAt?: Date }>(
    getModel: () => Model<T>,
    zodSchema: z.ZodTypeAny,
    options?: {
        sort?: Record<string, 1 | -1>;
        searchFields?: string[];
        allowedRoles?: ("superadmin" | "subadmin" | "seo_content")[];
    }
) {
    const sort = options?.sort ?? { createdAt: -1 } as any;
    const searchFields = options?.searchFields ?? [];
    const allowedRoles = options?.allowedRoles;

    async function list(req: Request) {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (allowedRoles && !hasRole(session, allowedRoles)) return fail("Forbidden", 403);
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
        const search = (searchParams.get("search") || "").trim();

        await connectDB();
        const Model = getModel();
        const query: Record<string, unknown> = {};
        if (search && searchFields.length) {
            const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            query.$or = searchFields.map((f) => ({ [f]: rx }));
        }
        const [items, total] = await Promise.all([
            Model.find(query).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
            Model.countDocuments(query),
        ]);
        return ok({
            items: items.map((i: any) => ({ ...i, _id: i._id.toString() })),
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
        });
    }

    async function create(req: Request) {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (allowedRoles && !hasRole(session, allowedRoles)) return fail("Forbidden", 403);
        const body = await req.json().catch(() => ({}));
        const parsed = zodSchema.safeParse(body);
        if (!parsed.success) {
            return fail(parsed.error.issues[0]?.message || "Invalid input", 400);
        }
        await connectDB();
        const Model = getModel();
        const doc = await Model.create(parsed.data);
        return ok({ ...doc.toObject(), _id: doc._id.toString() });
    }

    async function getOne(_req: Request, { params }: { params: { id: string } }) {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (allowedRoles && !hasRole(session, allowedRoles)) return fail("Forbidden", 403);
        await connectDB();
        const doc = await getModel().findById(params.id).lean();
        if (!doc) return notFound();
        return ok({ ...doc, _id: (doc as any)._id.toString() });
    }

    async function update(req: Request, { params }: { params: { id: string } }) {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (allowedRoles && !hasRole(session, allowedRoles)) return fail("Forbidden", 403);
        const body = await req.json().catch(() => ({}));
        const partialSchema = (zodSchema as any).partial ? (zodSchema as any).partial() : zodSchema;
        const parsed = partialSchema.safeParse(body);
        if (!parsed.success) {
            return fail(parsed.error.issues[0]?.message || "Invalid input", 400);
        }
        await connectDB();
        const doc = await getModel()
            .findByIdAndUpdate(params.id, parsed.data, { new: true })
            .lean();
        if (!doc) return notFound();
        return ok({ ...doc, _id: (doc as any)._id.toString() });
    }

    async function remove(_req: Request, { params }: { params: { id: string } }) {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (allowedRoles && !hasRole(session, allowedRoles)) return fail("Forbidden", 403);
        if (session.role !== "superadmin" && allowedRoles?.includes("superadmin")) {
            return fail("Forbidden", 403);
        }
        await connectDB();
        const doc = await getModel().findByIdAndDelete(params.id).lean();
        if (!doc) return notFound();
        return ok({ success: true });
    }

    return { list, create, getOne, update, remove };
}
