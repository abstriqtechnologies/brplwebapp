import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { getAdminSession } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
    try {
        // Auth: verify the admin JWT from cookie and extract the admin ID
        const session = await getAdminSession();
        if (!session) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const admin = await AdminUser.findById(session.sub).lean();
        if (!admin) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { ok: false, error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
                { status: 400 },
            );
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { ok: false, error: "File too large. Maximum size is 50 MB." },
                { status: 400 },
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate path: public/uploads/2026/06/uuid-filename.ext
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const ext = file.name.split(".").pop() || "webp";
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
        const filename = `${randomUUID()}-${safeName}`;
        const relativePath = path.join("uploads", year, month, filename);
        const absoluteDir = path.join(process.cwd(), "public", "uploads", year, month);
        const absolutePath = path.join(process.cwd(), "public", relativePath);

        await mkdir(absoluteDir, { recursive: true });
        await writeFile(absolutePath, buffer);

        return NextResponse.json({
            ok: true,
            data: { url: `/${relativePath.replace(/\\/g, "/")}`, filename: file.name },
        });
    } catch (err) {
        console.error("Upload error:", err);
        return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
    }
}
