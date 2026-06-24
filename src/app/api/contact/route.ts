import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import ContactLead from "@/models/ContactLead";
import { sendContactNotification } from "@/lib/email";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const partnerSchema = z.object({
    source: z.literal("partner-form"),
    firstName: z.string().min(2).max(60),
    lastName: z.string().min(2).max(60),
    companyName: z.string().max(120).optional().or(z.literal("")),
    email: z.string().email().max(160),
    contactNumber: z.string().min(10).max(20),
    partnershipType: z.enum(["Sponsorship", "Franchise"]),
    message: z.string().min(10).max(2000),
});

const contactSchema = z.object({
    source: z.literal("contact-form").optional().default("contact-form"),
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    mobileNumber: z.string().min(10).max(20),
    email: z.string().email().max(160),
    message: z.string().min(5).max(2000),
});

const bodySchema = z.union([partnerSchema, contactSchema]);

export async function POST(req: Request) {
    try {
        const json = await req.json().catch(() => ({}));
        const parsed = bodySchema.safeParse(json);
        if (!parsed.success) {
            const first = parsed.error.issues[0];
            return NextResponse.json(
                { success: false, error: first?.message || "Invalid input" },
                { status: 400 }
            );
        }
        const data: any = parsed.data;
        await connectDB();

        let lead;
        if (data.source === "partner-form") {
            lead = await ContactLead.create({
                name: `${data.firstName} ${data.lastName}`.trim(),
                email: data.email,
                phone: data.contactNumber,
                message: `[${data.partnershipType}] ${data.companyName ? `Company: ${data.companyName}\n\n` : ""}${data.message}`,
                source: "partner-form",
            });
        } else {
            lead = await ContactLead.create({
                name: `${data.firstName} ${data.lastName}`.trim(),
                email: data.email,
                phone: data.mobileNumber,
                message: data.message,
                source: "contact-form",
            });
        }

        // Best-effort admin notification (does not block the lead)
        sendContactNotification(lead).catch((err) => console.error("[contact] email notify failed", err));

        revalidatePath("/admin/contact-us-leads");
        return NextResponse.json({ success: true, id: lead._id.toString() });
    } catch (err: any) {
        console.error("[api/contact]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}