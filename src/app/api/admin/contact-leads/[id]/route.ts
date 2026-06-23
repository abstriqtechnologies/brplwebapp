import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import ContactLead from "@/models/ContactLead";
import { requireAdminDb, ok, notFound, fail, serverError } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
    status: z.enum(["new", "read", "replied", "archived"]).optional(),
    notes: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const body = await req.json().catch(() => ({}));
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) return fail("Invalid input", 400);

        await connectDB();
        const lead = await ContactLead.findByIdAndUpdate(params.id, parsed.data, { new: true }).lean();
        if (!lead) return notFound();
        return ok({ ...lead, _id: lead._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (session.role !== "superadmin") return fail("Forbidden", 403);
        await connectDB();
        const r = await ContactLead.findByIdAndDelete(params.id).lean();
        if (!r) return notFound();
        return ok({ success: true });
    } catch (err) {
        return serverError(err);
    }
}