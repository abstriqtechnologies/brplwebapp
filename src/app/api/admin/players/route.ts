/**
 * `/api/admin/players` — list users (players) from the MongoDB `User`
 * collection. Returns a compact projection suitable for the admin
 * players table.
 */

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { getAdminCookie } from "@/lib/auth/cookies";
import AdminUser from "@/models/AdminUser";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

export type AdminPlayer = {
    id: string;
    name: string;
    phone: string;
    city: string;
    state: string;
    paymentStatus: "pending" | "completed" | "—";
    registrationDate: string; // ISO 8601, derived from createdAt
};

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
    })(async () => {
        await connectDB();
        const docs = await User.find(
            {},
            { name: 1, phone: 1, city: 1, state: 1, paymentStatus: 1, createdAt: 1 }
        )
            .sort({ createdAt: -1 })
            .lean();

        const players: AdminPlayer[] = docs.map((d) => ({
            id: String(d._id),
            name: d.name?.trim() || "—",
            phone: d.phone || "—",
            city: d.city?.trim() || "—",
            state: d.state?.trim() || "—",
            paymentStatus: (d.paymentStatus as "pending" | "completed") || "—",
            registrationDate:
                d.createdAt instanceof Date
                    ? d.createdAt.toISOString()
                    : new Date(d.createdAt as unknown as string | number).toISOString(),
        }));

        return ok({ players });
    }),
);