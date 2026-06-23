import { jsPDF } from "jspdf";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin, notFound, serverError } from "@/lib/adminApi";
import User from "@/models/User";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdmin();
        if (session instanceof Response) return session;
        if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound("Invalid user id");

        await connectDB();
        const user = await User.findById(params.id).lean();
        if (!user) return notFound("User not found");

        const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const ml = 20;
        const mr = pw - 20;
        const cx = pw / 2;
        const INR = (n: number) => "Rs. " + n.toLocaleString("en-IN");
        const b = (ok: boolean) => doc.setFont("helvetica", ok ? "bold" : "normal");

        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pw, 50, "F");
        doc.setFillColor(245, 158, 11);
        doc.rect(0, 48, pw, 2, "F");

        doc.setTextColor(255, 255, 255);
        b(true);
        doc.setFontSize(22);
        doc.text("BEYOND REACH PREMIER LEAGUE", cx, 21, { align: "center" });
        b(false);
        doc.setFontSize(9);
        doc.setTextColor(251, 191, 36);
        doc.text("REGISTRATION INVOICE", cx, 35, { align: "center" });

        const invNo = `INV-BRPL-${user._id.toString().slice(-10).toUpperCase()}`;
        const dateStr = new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

        b(false);
        doc.setFontSize(9);
        doc.setTextColor(130, 130, 130);
        doc.text("Invoice Number", ml, 70);
        doc.text("Date", ml, 82);

        b(true);
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(invNo, ml + 50, 70);
        doc.text(dateStr, ml + 50, 82);

        const biX = ml + 100;
        b(true);
        doc.setFontSize(10);
        doc.text("BILL TO", biX, 70);

        b(false);
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const byLines = [
            user.name || "Player",
            user.email || "-",
            `+91 ${user.phone || "-"}`,
            [user.city, user.state].filter(Boolean).join(", ") || "-",
        ];
        let by = 80;
        for (const line of byLines) {
            doc.text(line, biX, by);
            by += 7;
        }

        const div = Math.max(by + 6, 102);
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.5);
        doc.line(ml, div, mr, div);

        const tY = div + 12;
        const amtR = mr;
        const colDesc = ml;
        const colQty = ml + 110;
        const rh = 9;

        doc.setFillColor(15, 23, 42);
        doc.rect(ml, tY, mr - ml, rh, "F");
        doc.setTextColor(255, 255, 255);
        b(true);
        doc.setFontSize(8);
        doc.text("DESCRIPTION", colDesc + 4, tY + 6);
        doc.text("QTY", colQty + 4, tY + 6);
        doc.text("AMOUNT", amtR - 4, tY + 6, { align: "right" });

        const rY = tY + rh;
        doc.setFillColor(249, 250, 251);
        doc.rect(ml, rY, mr - ml, rh, "F");
        doc.setTextColor(15, 23, 42);
        b(false);
        doc.setFontSize(9);
        doc.text("BRPL Player Registration Fee", colDesc + 4, rY + 6);
        doc.text("1", colQty + 4, rY + 6);
        b(true);
        doc.text(INR(user.amount ?? 1499), amtR - 4, rY + 6, { align: "right" });

        const sY = rY + rh + 1;
        doc.setFillColor(245, 158, 11);
        doc.rect(ml, sY, mr - ml, rh + 2, "F");
        doc.setTextColor(0, 0, 0);
        b(true);
        doc.setFontSize(11);
        doc.text("Total Paid", colDesc + 4, sY + 7.5);
        doc.text(INR(user.amount ?? 1499), amtR - 4, sY + 7.5, { align: "right" });

        doc.setFillColor(15, 23, 42);
        doc.rect(0, ph - 20, pw, 20, "F");
        doc.setTextColor(170, 170, 170);
        b(false);
        doc.setFontSize(7);
        doc.text("Beyond Reach Premier League  -  www.brpl.net", cx, ph - 7, { align: "center" });

        const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="BRPL-Invoice-${user.phone || "player"}.pdf"`,
            },
        });
    } catch (err) {
        return serverError(err);
    }
}
