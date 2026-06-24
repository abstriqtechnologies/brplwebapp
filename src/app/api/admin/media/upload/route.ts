import sharp from "sharp";
import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireAdmin, ok, fail, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";
import { writeUpload, validateUpload, detectKind, UploadValidationError } from "@/lib/mediaStorage";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORAGE_ROOT = process.env.MEDIA_STORAGE_PATH || "public/uploads";

export async function POST(req: Request) {
    try {
        const session = await requireAdmin();
        if (session instanceof Response) return session;
        if (!session.email) return fail("Missing admin email on session", 401);

        let form: FormData;
        try {
            form = await req.formData();
        } catch {
            return fail("Invalid multipart body", 400);
        }

        const file = form.get("file");
        if (!(file instanceof File)) return fail("Missing file field", 400);

        let kind;
        try {
            kind = validateUpload({ size: file.size, type: file.type });
        } catch (err) {
            if (err instanceof UploadValidationError) return fail(err.message, err.status);
            throw err;
        }

        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);

        let width: number | undefined;
        let height: number | undefined;

        if (kind === "image" && detectKind(file.type) === "image") {
            try {
                const meta = await sharp(buffer).rotate().metadata();
                width = meta.width;
                height = meta.height;
            } catch (err: any) {
                return fail(`Could not process image: ${err?.message || "unknown"}`, 400);
            }
        }

        const { url, relativePath } = await writeUpload(buffer, file.type);

        // For images, also write a 1920px webp sibling.
        let webpUrl: string | undefined;
        if (kind === "image" && width && height) {
            try {
                const resized = await sharp(buffer).rotate().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
                const webpRel = relativePath.replace(/\.[^.]+$/, ".webp");
                const webpAbs = path.join(process.cwd(), STORAGE_ROOT, webpRel);
                await fs.mkdir(path.dirname(webpAbs), { recursive: true });
                await fs.writeFile(webpAbs, resized);
                webpUrl = `/uploads/${webpRel.split(path.sep).join("/")}`;
            } catch {
                /* webp sibling is best-effort */
            }
        }

        await connectDB();
        const doc = await Media.create({
            url,
            originalName: file.name,
            mime: file.type,
            kind,
            size: file.size,
            width,
            height,
            folder: typeof form.get("folder") === "string" ? (form.get("folder") as string) : undefined,
            tags: form.getAll("tags").filter((t): t is string => typeof t === "string"),
            uploadedBy: session.email,
        });

        revalidateSite(TAGS.MEDIA);

        return ok({
            id: doc._id.toString(),
            url: doc.url,
            webpUrl,
            mime: doc.mime,
            kind: doc.kind,
            size: doc.size,
            width: doc.width,
            height: doc.height,
            originalName: doc.originalName,
        });
    } catch (err) {
        if (err instanceof UploadValidationError) return fail(err.message, err.status);
        console.error("[media/upload]", err);
        return serverError(err);
    }
}
