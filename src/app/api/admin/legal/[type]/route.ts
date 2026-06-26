import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import LegalPage from "@/models/LegalPage";
import { requireAdminDb, ok, fail, notFound, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = ["privacy", "terms", "rulebook"] as const;

const schema = z.object({
    title: z.string().min(1).max(300),
    content: z.string().min(1),
    version: z.string().max(20).default("1.0"),
    effectiveDate: z.string().datetime().or(z.string()).optional(),
});

export async function GET(_req: Request, { params }: { params: { type: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!TYPES.includes(params.type as any)) return fail("Invalid type", 400);
        const legalType = params.type as "privacy" | "terms" | "rulebook";
        await connectDB();
        let doc = await LegalPage.findOne({ type: legalType }).lean();
        if (!doc) {
            const created = await LegalPage.create({
                type: legalType,
                title:
                    legalType === "privacy"
                        ? "Privacy Policy"
                        : legalType === "terms"
                          ? "Terms & Conditions"
                          : "Rule Book",
                content: "",
                version: "1.0",
            });
            doc = created.toObject();
        }
        return ok({ ...doc, _id: doc._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}

export async function PATCH(req: Request, { params }: { params: { type: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!TYPES.includes(params.type as any)) return fail("Invalid type", 400);
        const legalType = params.type as "privacy" | "terms" | "rulebook";
        const body = await req.json().catch(() => ({}));
        const parsed = schema.safeParse(body);
        if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid input", 400);
        await connectDB();
        const doc = await LegalPage.findOneAndUpdate(
            { type: legalType },
            { ...parsed.data, type: legalType },
            { upsert: true, returnDocument: "after" },
        ).lean();
        if (!doc) return notFound();
        revalidateSite(TAGS.LEGAL);
        return ok({ ...doc, _id: doc._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}
