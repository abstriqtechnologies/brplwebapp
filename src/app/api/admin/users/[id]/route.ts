import { requireAdminDb, ok, notFound, serverError, fail } from "@/lib/adminApi";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;

        if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound("Invalid user id");

        await connectDB();
        const user = await User.findById(params.id).lean();
        if (!user) return notFound("User not found");

        return ok({
            ...user,
            _id: user._id.toString(),
            isPaid: user.paymentStatus === "completed",
        });
    } catch (err) {
        return serverError(err);
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound("Invalid user id");

        const body = await req.json().catch(() => ({}));
        const allowed: Record<string, unknown> = {};
        for (const k of ["name", "email", "city", "state", "role", "phone"]) {
            if (k in body) allowed[k] = body[k];
        }

        await connectDB();
        const user = await User.findByIdAndUpdate(params.id, allowed, { new: true }).lean();
        if (!user) return notFound("User not found");
        return ok({ ...user, _id: user._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (session.session.role !== "superadmin") return fail("Forbidden", 403);
        if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound("Invalid user id");

        await connectDB();
        const deleted = await User.findByIdAndDelete(params.id).lean();
        if (!deleted) return notFound("User not found");
        return ok({ success: true });
    } catch (err) {
        return serverError(err);
    }
}
