import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { env } from "@/lib/env";

/**
 * Local-disk storage adapter for admin uploads. Files live under
 * `public/uploads/<yyyy>/<mm>/<random>.<ext>` and are served by Next.js
 * as static assets.
 */

const STORAGE_ROOT = env.MEDIA_STORAGE_PATH;
const PUBLIC_PREFIX = "/uploads"; // what's in the URL after the host

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/svg+xml"]);

const VIDEO_MIMES = new Set(["video/mp4", "video/webm"]);

export type UploadKind = "image" | "video";

export class UploadValidationError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
        this.name = "UploadValidationError";
    }
}

export function detectKind(mime: string): UploadKind | null {
    if (IMAGE_MIMES.has(mime)) return "image";
    if (VIDEO_MIMES.has(mime)) return "video";
    return null;
}

export function validateUpload(file: { size: number; type: string }) {
    const kind = detectKind(file.type);
    if (!kind) {
        throw new UploadValidationError(415, `Unsupported file type: ${file.type}`);
    }
    const max = kind === "image" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
    if (file.size > max) {
        const mb = Math.round(max / 1024 / 1024);
        throw new UploadValidationError(413, `File too large (max ${mb} MB)`);
    }
    return kind;
}

function extFromMime(mime: string): string {
    if (mime === "image/png") return "png";
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/webp") return "webp";
    if (mime === "image/gif") return "gif";
    if (mime === "image/avif") return "avif";
    if (mime === "image/svg+xml") return "svg";
    if (mime === "video/mp4") return "mp4";
    if (mime === "video/webm") return "webm";
    return "bin";
}

/**
 * Write a buffer to disk under <root>/<yyyy>/<mm>/<random>.<ext>.
 * Returns the relative URL (e.g. "/uploads/2026/06/abc.jpg") and the absolute path.
 */
export async function writeUpload(
    buffer: Buffer,
    mime: string,
): Promise<{ url: string; absolutePath: string; relativePath: string }> {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const random = crypto.randomUUID().slice(0, 12);
    const ext = extFromMime(mime);

    const relativeDir = path.join(yyyy, mm);
    const filename = `${random}.${ext}`;
    const relativePath = path.join(relativeDir, filename);
    const absoluteDir = path.join(process.cwd(), STORAGE_ROOT, relativeDir);
    const absolutePath = path.join(absoluteDir, filename);

    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    // URL is the public path under /uploads/
    const url = `${PUBLIC_PREFIX}/${relativePath.split(path.sep).join("/")}`;
    return { url, absolutePath, relativePath };
}

/**
 * Delete a file from disk given its public URL (e.g. "/uploads/2026/06/abc.jpg").
 * Returns true if a file was removed, false otherwise.
 */
export async function deleteUpload(url: string): Promise<boolean> {
    if (!url.startsWith(PUBLIC_PREFIX + "/")) return false;
    const relativePath = url.slice(PUBLIC_PREFIX.length + 1);
    const absolutePath = path.join(process.cwd(), STORAGE_ROOT, relativePath);
    try {
        await fs.unlink(absolutePath);
        // Try to remove empty parent directories (best-effort, ignore errors)
        const dir = path.dirname(absolutePath);
        try {
            const files = await fs.readdir(dir);
            if (files.length === 0) await fs.rmdir(dir);
        } catch {
            /* ignore */
        }
        return true;
    } catch {
        return false;
    }
}
