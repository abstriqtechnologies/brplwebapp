import { jsPDF } from "jspdf";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { connectDB } from "@/lib/mongodb";
import { getAuthSession } from "@/lib/session";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_AMOUNT = 1499;
const SUPPORT_EMAIL = "support@Brpl.net";

export async function GET(_req: Request) {
    try {
        const session = await getAuthSession();
        if (!session) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        await connectDB();
        const user = await User.findById(session.sub).lean();
        if (!user) {
            return new Response(JSON.stringify({ error: "User not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (user.paymentStatus !== "completed") {
            return new Response(JSON.stringify({ error: "Payment not completed" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Load the most recent completed payment for richer transaction fields
        const latestPayment = await Payment.findOne({
            userId: user._id,
            status: "completed",
        })
            .sort({ createdAt: -1 })
            .lean();

        // Prefer Payment fields where present
        // Note: Payment.amount is in PAISE (Razorpay's smallest unit); User.amount is in RUPEES.
        // Convert paise → rupees when reading from Payment, then fall back to User.amount (rupees).
        const paymentId = latestPayment?.paymentId ?? user.paymentId ?? "-";
        const orderId = latestPayment?.orderId ?? user.orderId ?? "-";
        const method = latestPayment?.method ?? "Razorpay";
        const amount =
            latestPayment?.amount != null
                ? latestPayment.amount / 100
                : user.amount ?? FALLBACK_AMOUNT;
        const paymentDate = latestPayment?.createdAt ?? user.createdAt ?? new Date();
        const source = latestPayment?.source ?? "razorpay";

        // Resolve role label
        const roleLabel = user.role && ROLE_LABELS[user.role as UserRole] ? ROLE_LABELS[user.role as UserRole] : user.role || "-";

        // Build the PDF
        const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const ml = 20;
        const mr = pw - 20;
        const cx = pw / 2;
        // Always show 2 decimal places (e.g. "Rs. 1,499.00") so the amount reads as rupees
        const INR = (n: number) =>
            "Rs. " +
            Number(n).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        const b = (ok: boolean) => doc.setFont("helvetica", ok ? "bold" : "normal");

        // ── Header band ──────────────────────────────────────────────
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pw, 50, "F");
        doc.setFillColor(245, 158, 11);
        doc.rect(0, 48, pw, 2, "F");

        // Try to embed the Brpl logo; fall back to text brand mark
        try {
            const logoPath = path.join(process.cwd(), "public", "logo.webp");
            const webpBuf = await fs.readFile(logoPath);
            const pngBuf = await sharp(webpBuf).png().toBuffer();
            // Logo dimensions: ~22mm wide, aspect-ratio preserved (assume square-ish)
            doc.addImage(pngBuf, "PNG", ml, 12, 22, 22);
        } catch {
            // Fallback: amber square with "Brpl" text mark
            doc.setFillColor(245, 158, 11);
            doc.rect(ml, 12, 22, 22, "F");
            doc.setTextColor(15, 23, 42);
            b(true);
            doc.setFontSize(11);
            doc.text("Brpl", ml + 11, 26, { align: "center" });
        }

        doc.setTextColor(255, 255, 255);
        b(true);
        doc.setFontSize(22);
        doc.text("BEYOND REACH PREMIER LEAGUE", cx + 14, 21, { align: "center" });
        b(false);
        doc.setFontSize(9);
        doc.setTextColor(251, 191, 36);
        doc.text("REGISTRATION INVOICE", cx + 14, 35, { align: "center" });

        // ── Invoice meta ─────────────────────────────────────────────
        const invNo = `INV-Brpl-${user._id.toString().slice(-10).toUpperCase()}`;
        const dateStr = new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
        const txnDateStr = new Date(paymentDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

        b(false);
        doc.setFontSize(9);
        doc.setTextColor(130, 130, 130);
        doc.text("Invoice Number", ml, 70);
        doc.text("Invoice Date", ml, 79);
        doc.text("Transaction Date", ml, 88);
        doc.text("Payment Method", ml, 97);
        doc.text("Transaction ID", ml, 106);
        doc.text("Order ID", ml, 115);

        b(true);
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(invNo, ml + 45, 70);
        doc.text(dateStr, ml + 45, 79);
        doc.text(txnDateStr, ml + 45, 88);
        doc.text(`${method} (${source})`, ml + 45, 97);
        doc.text(paymentId, ml + 45, 106);
        doc.text(orderId, ml + 45, 115);

        // ── Bill To block ────────────────────────────────────────────
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
            `Role: ${roleLabel}`,
        ];
        let by = 79;
        for (const line of byLines) {
            doc.text(line, biX, by);
            by += 7;
        }

        // ── Divider ──────────────────────────────────────────────────
        const div = Math.max(by + 6, 125);
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.5);
        doc.line(ml, div, mr, div);

        // ── Line items table ─────────────────────────────────────────
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
        doc.text("Brpl Player Registration Fee", colDesc + 4, rY + 6);
        doc.text("1", colQty + 4, rY + 6);
        b(true);
        doc.text(INR(amount), amtR - 4, rY + 6, { align: "right" });

        // ── Totals ───────────────────────────────────────────────────
        const subtotalY = rY + rh + 6;
        b(false);
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text("Subtotal", amtR - 50, subtotalY);
        doc.text(INR(amount), amtR - 4, subtotalY, { align: "right" });

        doc.text("Discount", amtR - 50, subtotalY + 7);
        doc.text(INR(0), amtR - 4, subtotalY + 7, { align: "right" });

        const sY = subtotalY + 14;
        doc.setFillColor(245, 158, 11);
        doc.rect(ml, sY, mr - ml, rh + 2, "F");
        doc.setTextColor(0, 0, 0);
        b(true);
        doc.setFontSize(11);
        doc.text("Total Paid", colDesc + 4, sY + 7.5);
        doc.text(INR(amount), amtR - 4, sY + 7.5, { align: "right" });

        // ── Thank-you note ───────────────────────────────────────────
        const tyY = sY + rh + 14;
        b(true);
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("Thank you for registering with Brpl!", cx, tyY, { align: "center" });
        b(false);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
            "Your spot is confirmed. We'll be in touch with team and fixture details soon.",
            cx,
            tyY + 6,
            { align: "center" }
        );

        // ── Footer band ──────────────────────────────────────────────
        doc.setFillColor(15, 23, 42);
        doc.rect(0, ph - 20, pw, 20, "F");
        doc.setTextColor(170, 170, 170);
        b(false);
        doc.setFontSize(7);
        doc.text("Brpl  -  www.Brpl.net", cx, ph - 10, { align: "center" });
        doc.text(`For support, contact ${SUPPORT_EMAIL}`, cx, ph - 5, { align: "center" });

        const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
        const safePhone = user.phone || "player";
        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Brpl-Invoice-${safePhone}.pdf"`,
            },
        });
    } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Internal error";
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}