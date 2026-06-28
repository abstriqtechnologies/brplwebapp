/**
 * `/api/admin/pages` — admin CRUD list for site pages.
 *
 *   GET /api/admin/pages
 *
 * Auth: superadmin.
 */

import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import SitePage from "@/models/SitePage";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
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

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async () => {
        await connectDB();
        const docs = await SitePage.find({}).sort({ key: 1 }).lean();

        // Map registry to include pages that don't have DB entries yet
        const dbMap = new Map((docs as any[]).map((d: any) => [d.key, d]));
        const pages = Object.entries(PAGE_REGISTRY).map(([key, config]) => {
            const dbDoc = dbMap.get(key);
            return {
                key,
                label: config.label,
                sectionCount: config.sections.length,
                updatedAt: dbDoc?.updatedAt?.toISOString?.() || null,
                createdAt: dbDoc?.createdAt?.toISOString?.() || null,
            };
        });

        return ok({ pages });
    }),
);
