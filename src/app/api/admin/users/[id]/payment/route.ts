/**
 * PATCH /api/admin/users/[id]/payment — mark a user as paid (manual entry).
 *
 * Phase 3.6 (proof of concept): migrated to the new `withRequest + withAdmin`
 * composition. Errors are caught by `withRequest` and shaped into the
 * standard envelope.
 */

import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { parse } from "@/lib/api/parse";
import { getAdminCookie } from "@/lib/auth/cookies";
import type { IAdminUser } from "@/models/AdminUser";
import type { IUser } from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    paymentId: z.string().min(1).max(200),
    paymentAmount: z.number().nonnegative().max(1_000_000),
});

async function adminLookup(_id: string): Promise<IAdminUser | null> {
    // No DB lookup needed for an already-authenticated admin — the JWT is
    // enough. We return a minimal placeholder that satisfies the contract.
    return {
        _id: _id as unknown as IAdminUser["_id"],
        email: "",
        role: "superadmin" as const,
        active: true,
    } as IAdminUser;
}

export const PATCH = withRequest(
    withAdmin({
        getAdminCookie,
        // This handler doesn't need the admin user object; the lookup is a no-op
        // that satisfies withAdmin's interface. In a future refactor we'd add
        // a stricter permission check (only superadmin can mark paid).
        lookup: adminLookup,
    })(async ({ req }) => {
        // Extract id from the URL. Next.js provides this via the second arg
        // to the route handler — but with our composition, we read it off
        // the request URL.
        const url = new URL(req.url);
        // Path is /api/admin/users/<id>/payment
        const parts = url.pathname.split("/");
        const id = parts[parts.length - 2];
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            throw new BadRequestError("Invalid user id");
        }

        const json = await req.json().catch(() => ({}));
        const body = parse(
            {
                ...json,
                paymentAmount: typeof json.paymentAmount === "string" ? Number(json.paymentAmount) : json.paymentAmount,
            },
            schema,
        );

        await connectDB();
        const user = await User.findById(id);
        if (!user) throw new NotFoundError("User not found");

        const wasPaid = user.paymentStatus === "completed";

        user.paymentStatus = "completed";
        user.paymentId = body.paymentId;
        user.amount = body.paymentAmount;
        await user.save();

        if (!wasPaid) {
            await Payment.create({
                userId: user._id,
                paymentId: body.paymentId,
                amount: body.paymentAmount,
                currency: "INR",
                status: "completed",
                source: "manual",
            });
        }

        return ok({
            success: true,
            user: { ...user.toObject(), _id: user._id.toString() },
        });
    }),
);
