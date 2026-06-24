# CMS Phase 2: Admin File Uploads & Media Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete file-upload pipeline + media library so admins can upload images and videos directly from the admin and use them in any CMS field.

**Architecture:** Single reusable `<MediaUploadField>` component + a real `/admin/media` page. Files stored on local disk under `public/uploads/<yyyy>/<mm>/<random>.<ext>`; `sharp` produces a 1920px webp sibling for each image. New `Media` Mongoose model tracks metadata. All admin URL fields get swept to use the new component.

**Tech Stack:** Next.js 14 App Router (server route handlers for upload), `sharp` for image processing, Mongoose 9, React 18, shadcn/ui, `crypto.randomUUID` for filename generation.

**Spec:** `docs/superpowers/specs/2026-06-24-cms-phase2-uploads-design.md`

**Project conventions:**
- API routes return `{ ok, data }` or `{ ok: false, error }` envelopes (consistent with existing admin API).
- All admin endpoints require `requireAdminDb` from `@/lib/adminApi`.
- Admin writes call `revalidateSite(TAGS.X)` on the success path.
- Imports use the `@/` alias.

**Manual verification only** — this project has no automated test suite today. Each task ends with concrete verification steps.

---

## File Structure

**New (9):**
- `src/models/Media.ts` — Mongoose model.
- `src/lib/mediaStorage.ts` — local-disk adapter (`writeUpload`, `deleteUpload`).
- `src/app/api/admin/media/upload/route.ts` — POST handler.
- `src/app/api/admin/media/route.ts` — GET list.
- `src/app/api/admin/media/folders/route.ts` — GET distinct folder names.
- `src/app/api/admin/media/[id]/route.ts` — PATCH + DELETE.
- `src/components/admin/MediaPicker.tsx` — modal with Library + Upload tabs.
- `src/components/admin/MediaUploadField.tsx` — form-field widget.
- `src/app/(admin)/admin/media/page.tsx` — library page.

**Modify (~20):**
- `package.json` — add `sharp`.
- `src/lib/revalidate.ts` — add `TAGS.MEDIA`.
- `src/lib/siteContext.ts` — add Media slice.
- `src/apihelper/admin.ts` — add media helpers.
- `src/components/admin/AdminSidebar.tsx` — add Media Library entry.
- `src/components/admin/CmsForm.tsx` — extend `CmsField` to support image/video flags.
- `next.config.mjs` — extend `Cache-Control` to cover `/uploads/:path*`.
- `.gitignore` — add `public/uploads/`.
- 17 admin pages — replace `<Input type="url">` for image fields with `<MediaUploadField>`.

---

## Task 1: Add `sharp` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add sharp**

Edit `package.json`. In `dependencies`, add `"sharp": "^0.33.0"` (latest stable as of 2026). Place it alphabetically near `"react"`.

- [ ] **Step 2: Install**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm install --no-audit --no-fund --prefer-offline 2>&1 | tail -10`
Expected: `added 1 package` or similar (sharp pulls a few native binaries).

- [ ] **Step 3: Verify build still passes**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add package.json package-lock.json && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(deps): add sharp for image processing"
```

---

## Task 2: Add `Media` Mongoose model

**Files:**
- Create: `src/models/Media.ts`

- [ ] **Step 1: Create the model**

Create `src/models/Media.ts` with this exact content:

```ts
import mongoose, { Schema, Model, Document } from "mongoose";

export type MediaKind = "image" | "video";

export interface IMedia extends Document {
    _id: mongoose.Types.ObjectId;
    url: string;
    originalName: string;
    mime: string;
    kind: MediaKind;
    size: number;
    width?: number;
    height?: number;
    durationSec?: number;
    folder?: string;
    tags: string[];
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
    {
        url: { type: String, required: true, unique: true, index: true },
        originalName: { type: String, required: true },
        mime: { type: String, required: true },
        kind: { type: String, enum: ["image", "video"], required: true, index: true },
        size: { type: Number, required: true },
        width: { type: Number },
        height: { type: Number },
        durationSec: { type: Number },
        folder: { type: String, index: true },
        tags: { type: [String], default: [] },
        uploadedBy: { type: String, required: true },
    },
    { timestamps: true }
);

// Compound indexes for the library's filter+sort patterns
MediaSchema.index({ folder: 1, createdAt: -1 });
MediaSchema.index({ kind: 1, createdAt: -1 });
// Text index for filename search
MediaSchema.index({ originalName: "text" });

const Media: Model<IMedia> =
    (mongoose.models.Media as Model<IMedia>) ||
    mongoose.model<IMedia>("Media", MediaSchema);

export default Media;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/models/Media.ts && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(model): add Media collection for admin uploads"
```

---

## Task 3: Add `MEDIA` tag and storage adapter

**Files:**
- Modify: `src/lib/revalidate.ts`
- Create: `src/lib/mediaStorage.ts`

- [ ] **Step 1: Add MEDIA tag**

Open `src/lib/revalidate.ts`. In the `TAGS` object, add a new line:

```ts
    MEDIA: "site-context:media",
```

Place it after `COLLECTIONS`.

- [ ] **Step 2: Create the storage adapter**

Create `src/lib/mediaStorage.ts` with this exact content:

```ts
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Local-disk storage adapter for admin uploads. Files live under
 * `public/uploads/<yyyy>/<mm>/<random>.<ext>` and are served by Next.js
 * as static assets.
 */

const STORAGE_ROOT = process.env.MEDIA_STORAGE_PATH || "public/uploads";
const PUBLIC_PREFIX = "/uploads"; // what's in the URL after the host

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

const IMAGE_MIMES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/svg+xml",
]);

const VIDEO_MIMES = new Set(["video/mp4", "video/webm"]);

export type UploadKind = "image" | "video";

export class UploadValidationError extends Error {
    constructor(public status: number, message: string) {
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
    mime: string
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
```

- [ ] **Step 3: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/lib/revalidate.ts src/lib/mediaStorage.ts && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(media): storage adapter + MEDIA cache tag"
```

Expected: `✓ Compiled successfully`.

---

## Task 4: Implement upload API route

**Files:**
- Create: `src/app/api/admin/media/upload/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/admin/media/upload/route.ts` with this exact content:

```ts
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
        let webpAbsolutePath: string | undefined;

        if (kind === "image" && detectKind(file.type) === "image") {
            try {
                const meta = await sharp(buffer).rotate().metadata();
                width = meta.width;
                height = meta.height;
            } catch (err: any) {
                return fail(`Could not process image: ${err?.message || "unknown"}`, 400);
            }
        }

        const { url, absolutePath, relativePath } = await writeUpload(buffer, file.type);

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
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/app/api/admin/media/ && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin-api): media upload endpoint with sharp resize"
```

---

## Task 5: Implement media list + folders + item endpoints

**Files:**
- Create: `src/app/api/admin/media/route.ts`
- Create: `src/app/api/admin/media/folders/route.ts`
- Create: `src/app/api/admin/media/[id]/route.ts`

- [ ] **Step 1: Create list endpoint**

Create `src/app/api/admin/media/route.ts`:

```ts
import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireAdminDb, ok, serverError } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;

        const { searchParams } = new URL(req.url);
        const folder = searchParams.get("folder") || undefined;
        const kind = searchParams.get("kind") || undefined;
        const search = searchParams.get("search") || undefined;
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(96, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));

        const query: Record<string, unknown> = {};
        if (folder) query.folder = folder;
        if (kind === "image" || kind === "video") query.kind = kind;
        if (search) query.$or = [
            { originalName: { $regex: escapeRegex(search), $options: "i" } },
            { folder: { $regex: escapeRegex(search), $options: "i" } },
            { tags: { $regex: escapeRegex(search), $options: "i" } },
        ];

        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            Media.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Media.countDocuments(query),
        ]);

        return ok({
            items: items.map((m) => ({
                ...m,
                _id: m._id.toString(),
                webpUrl: m.kind === "image" && m.url ? m.url.replace(/\.[^.]+$/, ".webp") : undefined,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (err) {
        return serverError(err);
    }
}

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 2: Create folders endpoint**

Create `src/app/api/admin/media/folders/route.ts`:

```ts
import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireAdminDb, ok, serverError } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const folders = await Media.distinct("folder", { folder: { $ne: null, $ne: "" } });
        return ok(folders.filter((f): f is string => typeof f === "string" && f.length > 0).sort());
    } catch (err) {
        return serverError(err);
    }
}
```

- [ ] **Step 3: Create item endpoint**

Create `src/app/api/admin/media/[id]/route.ts`:

```ts
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireAdminDb, ok, fail, notFound, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";
import { deleteUpload } from "@/lib/mediaStorage";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
    folder: z.string().optional(),
    originalName: z.string().min(1).max(300).optional(),
    tags: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
        const body = await req.json().catch(() => ({}));
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid input", 400);

        await connectDB();
        const doc = await Media.findByIdAndUpdate(params.id, parsed.data, { new: true }).lean();
        if (!doc) return notFound();
        revalidateSite(TAGS.MEDIA);
        return ok({ ...doc, _id: doc._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();

        await connectDB();
        const doc = await Media.findById(params.id).lean();
        if (!doc) return notFound();

        await deleteUpload(doc.url);
        // Also try to delete the webp sibling if present
        if (doc.kind === "image") {
            const webpUrl = doc.url.replace(/\.[^.]+$/, ".webp");
            await deleteUpload(webpUrl);
        }

        await Media.findByIdAndDelete(params.id);
        revalidateSite(TAGS.MEDIA);
        return ok({ success: true });
    } catch (err) {
        return serverError(err);
    }
}
```

- [ ] **Step 4: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/app/api/admin/media/route.ts src/app/api/admin/media/folders/route.ts src/app/api/admin/media/[id]/route.ts && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin-api): media list, folders, item endpoints"
```

Expected: `✓ Compiled successfully`.

---

## Task 6: Implement `MediaPicker` component

**Files:**
- Create: `src/components/admin/MediaPicker.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/admin/MediaPicker.tsx` with this exact content:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Loader2,
    Upload,
    Search,
    FolderOpen,
    X,
    Image as ImageIcon,
    Film,
    Trash2,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import api from "@/apihelper/api";

export interface MediaItem {
    _id: string;
    url: string;
    webpUrl?: string;
    originalName: string;
    mime: string;
    kind: "image" | "video";
    size: number;
    width?: number;
    height?: number;
    folder?: string;
    tags: string[];
    createdAt: string;
}

export interface MediaPickerResult {
    url: string;
    webpUrl?: string;
    mime: string;
    kind: "image" | "video";
}

export function MediaPicker({
    open,
    onOpenChange,
    onSelect,
    kind = "image",
    accept,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSelect: (result: MediaPickerResult) => void;
    kind?: "image" | "video" | "any";
    accept?: string;
}) {
    const [tab, setTab] = useState<"library" | "upload">("library");
    const [items, setItems] = useState<MediaItem[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [folder, setFolder] = useState<string>("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        loadFolders();
        load();
    }, [open, folder, page]);

    async function loadFolders() {
        try {
            const r = await api.get("/api/admin/media/folders");
            if (r.ok && r.data) setFolders(r.data);
        } catch {
            /* ignore */
        }
    }

    async function load() {
        setLoading(true);
        try {
            const r = await api.get("/api/admin/media", {
                folder: folder || undefined,
                kind: kind === "any" ? undefined : kind,
                search: search || undefined,
                page,
                limit: 24,
            });
            if (r.ok && r.data) {
                setItems(r.data.items);
                setPages(r.data.pagination.pages);
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to load media" });
        } finally {
            setLoading(false);
        }
    }

    function pickAndClose(item: MediaItem) {
        onSelect({ url: item.url, webpUrl: item.webpUrl, mime: item.mime, kind: item.kind });
        onOpenChange(false);
    }

    async function uploadFile(file: File) {
        setUploading(true);
        setProgress(0);
        try {
            const form = new FormData();
            form.append("file", file);
            // Use XHR for upload progress
            const result = await uploadWithProgress(form, (pct) => setProgress(pct));
            if (result.ok && result.data) {
                toast({ title: "Uploaded", description: file.name });
                // Refresh library
                setTab("library");
                setPage(1);
                load();
            } else {
                toast({ variant: "destructive", title: "Upload failed", description: result.error || "Unknown error" });
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Upload failed", description: err?.message || "Unknown error" });
        } finally {
            setUploading(false);
            setProgress(0);
        }
    }

    function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
        e.target.value = "";
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(file);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select media</DialogTitle>
                </DialogHeader>

                <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                    <TabsList>
                        <TabsTrigger value="library">Library</TabsTrigger>
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                    </TabsList>

                    <TabsContent value="library" className="space-y-3">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search filename..."
                                    className="pl-10"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") load(); }}
                                />
                            </div>
                            <select
                                value={folder}
                                onChange={(e) => { setFolder(e.target.value); setPage(1); }}
                                className="border rounded px-2 py-1 text-sm"
                            >
                                <option value="">All folders</option>
                                {folders.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>

                        <div className="overflow-y-auto max-h-[55vh] border rounded-md p-2">
                            {loading ? (
                                <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></div>
                            ) : items.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">No media yet — switch to the Upload tab.</div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                                    {items.map((item) => (
                                        <button
                                            key={item._id}
                                            onClick={() => pickAndClose(item)}
                                            className="border rounded overflow-hidden hover:ring-2 hover:ring-amber-400 text-left group"
                                        >
                                            {item.kind === "image" ? (
                                                <img src={item.webpUrl || item.url} alt={item.originalName} className="w-full aspect-square object-cover" loading="lazy" />
                                            ) : (
                                                <div className="w-full aspect-square bg-slate-100 flex items-center justify-center">
                                                    <Film className="w-8 h-8 text-slate-400" />
                                                </div>
                                            )}
                                            <div className="p-1.5 text-[10px] truncate">{item.originalName}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {pages > 1 && (
                            <div className="flex justify-between items-center text-xs text-slate-500">
                                <span>Page {page} of {pages}</span>
                                <div className="flex gap-1">
                                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                                    <Button size="sm" variant="outline" disabled={page === pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="upload">
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                                dragOver ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:border-slate-400"
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={accept || (kind === "video" ? "video/mp4,video/webm" : kind === "any" ? "image/*,video/mp4,video/webm" : "image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml")}
                                className="hidden"
                                onChange={onFileInput}
                            />
                            {uploading ? (
                                <div className="space-y-2">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
                                    <div className="text-sm">Uploading... {progress}%</div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="w-10 h-10 mx-auto text-slate-400" />
                                    <div className="font-medium">Drop a file here, or click to browse</div>
                                    <div className="text-xs text-slate-500">
                                        {kind === "video" ? "MP4 / WebM, max 50 MB" : kind === "any" ? "Images (5 MB) or videos (50 MB)" : "PNG / JPEG / WebP / GIF / AVIF / SVG, max 5 MB"}
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Upload a FormData via XHR so we can report progress.
 */
function uploadWithProgress(
    form: FormData,
    onProgress: (pct: number) => void
): Promise<{ ok: boolean; data?: any; error?: string; status: number }> {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/media/upload");
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
            try {
                const json = JSON.parse(xhr.responseText);
                resolve({ ok: xhr.status >= 200 && xhr.status < 300, data: json.data, error: json.error, status: xhr.status });
            } catch {
                resolve({ ok: false, error: "Invalid server response", status: xhr.status });
            }
        };
        xhr.onerror = () => resolve({ ok: false, error: "Network error", status: 0 });
        xhr.send(form);
    });
}
```

- [ ] **Step 2: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/components/admin/MediaPicker.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin): MediaPicker component (library + upload modal)"
```

Expected: `✓ Compiled successfully`.

---

## Task 7: Implement `MediaUploadField` component

**Files:**
- Create: `src/components/admin/MediaUploadField.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/admin/MediaUploadField.tsx` with this exact content:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Library, Upload, X, Film } from "lucide-react";
import { MediaPicker, type MediaPickerResult } from "./MediaPicker";

export interface MediaUploadFieldProps {
    label?: string;
    value: string;
    onChange: (url: string) => void;
    kind?: "image" | "video";
    accept?: string;
    /** Required label star (display only) */
    required?: boolean;
    /** Helper text shown under the field */
    hint?: string;
}

export function MediaUploadField({
    label,
    value,
    onChange,
    kind = "image",
    accept,
    required,
    hint,
}: MediaUploadFieldProps) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [mode, setMode] = useState<"library" | "upload">("library");

    const openPicker = (m: "library" | "upload") => {
        setMode(m);
        setPickerOpen(true);
    };

    const onSelect = (r: MediaPickerResult) => {
        onChange(r.url);
    };

    const isExternal = value && !value.startsWith("/uploads/") && !value.startsWith("data:");

    return (
        <div className="space-y-2">
            {label && (
                <Label className="block">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            )}

            {value && kind === "image" && (
                <div className="border rounded-md p-2 bg-slate-50 dark:bg-slate-900 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={value}
                        alt=""
                        className="max-h-32 max-w-xs object-contain"
                        onError={(e) => { (e.currentTarget.style.display = "none"); }}
                    />
                </div>
            )}
            {value && kind === "video" && (
                <div className="border rounded-md p-2 bg-slate-50 dark:bg-slate-900 inline-flex items-center gap-2 text-sm text-slate-600">
                    <Film className="w-4 h-4" />
                    <span className="truncate max-w-xs">{value.split("/").pop()}</span>
                </div>
            )}

            <div className="flex gap-2">
                <Input
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Paste a URL or upload below"
                    className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => openPicker("upload")}>
                    <Upload className="w-4 h-4 mr-1" /> Upload
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => openPicker("library")}>
                    <Library className="w-4 h-4 mr-1" /> Library
                </Button>
                {value && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")} title="Clear">
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {isExternal && (
                <p className="text-xs text-slate-500">External URL — not stored in the media library.</p>
            )}
            {hint && <p className="text-xs text-slate-500">{hint}</p>}

            <MediaPicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={onSelect}
                kind={kind}
                accept={accept}
            />
        </div>
    );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/components/admin/MediaUploadField.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin): MediaUploadField component"
```

Expected: `✓ Compiled successfully`.

---

## Task 8: Extend `CmsForm` to support image fields

**Files:**
- Modify: `src/components/admin/CmsForm.tsx`

- [ ] **Step 1: Update the CmsField type and render path**

Open `src/components/admin/CmsForm.tsx`. Find the `CmsField` type (around line 8):

```ts
export type CmsField = {
    name: string;
    label: string;
    type: "text" | "email" | "url" | "tel" | "number" | "textarea" | "boolean";
    required?: boolean;
    placeholder?: string;
    rows?: number;
};
```

Replace it with:

```ts
export type CmsField = {
    name: string;
    label: string;
    type: "text" | "email" | "url" | "tel" | "number" | "textarea" | "boolean";
    required?: boolean;
    placeholder?: string;
    rows?: number;
    /** Render an image picker field instead of a bare URL input. */
    image?: boolean;
    /** When image is true, control upload kind. */
    imageKind?: "image" | "video";
};
```

Then add an import near the top of the file (after the existing imports):

```ts
import { MediaUploadField } from "./MediaUploadField";
```

Find the render block where fields are iterated (the part starting `fields.map((f) => (`). Replace the entire field-rendering closure body with:

```tsx
                            {fields.map((f) => (
                                <div key={f.name} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                                    {f.image ? (
                                        <MediaUploadField
                                            label={f.label}
                                            value={data[f.name] ?? ""}
                                            onChange={(v) => set(f.name, v)}
                                            kind={f.imageKind || "image"}
                                            required={f.required}
                                        />
                                    ) : (
                                        <>
                                            <Label className="mb-2 block">
                                                {f.label}
                                                {f.required && <span className="text-red-500 ml-1">*</span>}
                                            </Label>
                                            {f.type === "textarea" ? (
                                                <Textarea
                                                    value={data[f.name] ?? ""}
                                                    onChange={(e) => set(f.name, e.target.value)}
                                                    rows={f.rows || 4}
                                                    placeholder={f.placeholder}
                                                    required={f.required}
                                                />
                                            ) : f.type === "boolean" ? (
                                                <Switch checked={Boolean(data[f.name])} onCheckedChange={(v) => set(f.name, v)} />
                                            ) : (
                                                <Input
                                                    type={f.type}
                                                    value={data[f.name] ?? ""}
                                                    onChange={(e) => set(f.name, e.target.value)}
                                                    placeholder={f.placeholder}
                                                    required={f.required}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
```

This adds an `image: true` opt-in. When set, the field renders `<MediaUploadField>`; otherwise, the existing logic is unchanged.

- [ ] **Step 2: Verify build**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/components/admin/CmsForm.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin): CmsForm supports image picker fields"
```

---

## Task 9: Implement `/admin/media` library page

**Files:**
- Create: `src/app/(admin)/admin/media/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/(admin)/admin/media/page.tsx` with this exact content:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FolderOpen, Trash2, Upload, Search, Film } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import api from "@/apihelper/api";

interface MediaItem {
    _id: string;
    url: string;
    webpUrl?: string;
    originalName: string;
    mime: string;
    kind: "image" | "video";
    size: number;
    width?: number;
    height?: number;
    folder?: string;
    tags: string[];
    createdAt: string;
}

export default function MediaLibraryPage() {
    const [items, setItems] = useState<MediaItem[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [folder, setFolder] = useState("");
    const [kind, setKind] = useState<"all" | "image" | "video">("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

    useEffect(() => { load(); }, [folder, kind, search, page]);

    async function load() {
        setLoading(true);
        try {
            const r = await api.get("/api/admin/media", {
                folder: folder || undefined,
                kind: kind === "all" ? undefined : kind,
                search: search || undefined,
                page,
                limit: 24,
            });
            if (r.ok && r.data) {
                setItems(r.data.items);
                setPages(r.data.pagination.pages);
                setTotal(r.data.pagination.total);
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to load" });
        } finally {
            setLoading(false);
        }
    }

    async function loadFolders() {
        try {
            const r = await api.get("/api/admin/media/folders");
            if (r.ok && r.data) setFolders(r.data);
        } catch {
            /* ignore */
        }
    }

    useEffect(() => { loadFolders(); }, []);

    async function uploadFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        setUploading(true);
        for (const file of Array.from(files)) {
            const form = new FormData();
            form.append("file", file);
            try {
                const r = await api.post("/api/admin/media/upload", form);
                if (!r.ok) {
                    toast({ variant: "destructive", title: `Upload failed: ${file.name}`, description: r.error || "Unknown error" });
                }
            } catch (err: any) {
                toast({ variant: "destructive", title: `Upload failed: ${file.name}`, description: err?.message || "Unknown error" });
            }
        }
        setUploading(false);
        load();
        loadFolders();
    }

    async function deleteItem(item: MediaItem) {
        if (!confirm(`Delete "${item.originalName}"? This will remove the file from disk.`)) return;
        try {
            const r = await api.delete(`/api/admin/media/${item._id}`);
            if (r.ok) {
                toast({ title: "Deleted", description: item.originalName });
                load();
            } else {
                toast({ variant: "destructive", title: "Error", description: r.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed" });
        }
    }

    function copyUrl(url: string) {
        navigator.clipboard.writeText(url).then(() => {
            toast({ title: "Copied", description: url });
        });
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold">Media Library</h1>
                <p className="text-slate-500 mt-1">Upload images and videos, browse and reuse across the site.</p>
            </div>

            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
                onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.multiple = true;
                    input.accept = "image/*,video/mp4,video/webm";
                    input.onchange = () => uploadFiles(input.files);
                    input.click();
                }}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    dragOver ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:border-slate-400"
                }`}
            >
                {uploading ? (
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                        <span className="text-sm">Uploading…</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 text-sm">
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span>Drop files here, or click to upload (images ≤5 MB, videos ≤50 MB)</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
                <Card>
                    <CardHeader><CardTitle className="text-sm">Folders</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        <button
                            onClick={() => { setFolder(""); setPage(1); }}
                            className={`block w-full text-left px-2 py-1 rounded ${!folder ? "bg-amber-100 text-amber-900" : "hover:bg-slate-100"}`}
                        >
                            All
                        </button>
                        {folders.map((f) => (
                            <button
                                key={f}
                                onClick={() => { setFolder(f); setPage(1); }}
                                className={`block w-full text-left px-2 py-1 rounded truncate ${folder === f ? "bg-amber-100 text-amber-900" : "hover:bg-slate-100"}`}
                                title={f}
                            >
                                <FolderOpen className="w-3 h-3 inline mr-1" />
                                {f}
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search filename..."
                                    className="pl-10"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>
                            <select
                                value={kind}
                                onChange={(e) => { setKind(e.target.value as any); setPage(1); }}
                                className="border rounded px-2 py-1 text-sm"
                            >
                                <option value="all">All kinds</option>
                                <option value="image">Images</option>
                                <option value="video">Videos</option>
                            </select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></div>
                        ) : items.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No media found.</div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {items.map((item) => (
                                        <div key={item._id} className="border rounded-lg overflow-hidden group">
                                            <div className="aspect-square bg-slate-100 relative">
                                                {item.kind === "image" ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={item.webpUrl || item.url}
                                                        alt={item.originalName}
                                                        className="w-full h-full object-cover cursor-pointer"
                                                        loading="lazy"
                                                        onClick={() => copyUrl(item.url)}
                                                        title="Click to copy URL"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center cursor-pointer" onClick={() => copyUrl(item.url)} title="Click to copy URL">
                                                        <Film className="w-12 h-12 text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2 text-xs space-y-1">
                                                <div className="truncate" title={item.originalName}>{item.originalName}</div>
                                                <div className="flex items-center justify-between text-slate-500">
                                                    <span>{(item.size / 1024).toFixed(0)} KB</span>
                                                    <span>{item.kind}</span>
                                                </div>
                                                {item.folder && (
                                                    <div className="truncate text-slate-500" title={item.folder}>
                                                        <FolderOpen className="w-3 h-3 inline mr-1" />
                                                        {item.folder}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="px-2 pb-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => copyUrl(item.url)}>Copy URL</Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => deleteItem(item)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center mt-4 text-sm text-slate-500">
                                    <span>{total} item{total === 1 ? "" : "s"}</span>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                                        <span className="self-center">Page {page} of {pages}</span>
                                        <Button size="sm" variant="outline" disabled={page === pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/app/\(admin\)/admin/media/page.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin): media library page with folders + search"
```

Expected: `✓ Compiled successfully`.

---

## Task 10: Add Media Library to admin sidebar + helpers + gitignore + cache header

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/apihelper/admin.ts`
- Modify: `next.config.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Add sidebar entry**

Open `src/components/admin/AdminSidebar.tsx`. Find the `allNavItems` array (or the `ALL_ITEMS` constant — names vary). Add a new entry near the top of the array (before the user-management items):

```ts
{ icon: Image as ImageIcon, label: "Media Library", path: "/admin/media" },
```

You'll also need to import `Image as ImageIcon` from `lucide-react` near the top of the file (rename if there's an existing `Image` import). For example, change the import line to:

```ts
import { Image as ImageIcon, /* ...other icons */ } from "lucide-react";
```

If you need to actually check the existing import, read the file first.

- [ ] **Step 2: Add admin helper functions**

Open `src/apihelper/admin.ts`. Append the following typed helpers at the end (before the closing default-export, if any):

```ts
// Media Library helpers
export const uploadMedia = async (file: File, opts?: { folder?: string; tags?: string[] }) => {
    const form = new FormData();
    form.append("file", file);
    if (opts?.folder) form.append("folder", opts.folder);
    if (opts?.tags) opts.tags.forEach((t) => form.append("tags", t));
    return api.post("/api/admin/media/upload", form);
};

export const listMedia = async (filters: {
    folder?: string; kind?: "image" | "video"; search?: string; page?: number; limit?: number;
}) => {
    const params = new URLSearchParams();
    if (filters.folder) params.append("folder", filters.folder);
    if (filters.kind) params.append("kind", filters.kind);
    if (filters.search) params.append("search", filters.search);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit));
    return api.get(`/api/admin/media?${params.toString()}`);
};

export const listMediaFolders = async () => api.get("/api/admin/media/folders");

export const updateMedia = async (id: string, body: { folder?: string; tags?: string[]; originalName?: string }) =>
    api.patch(`/api/admin/media/${id}`, body);

export const deleteMedia = async (id: string) => api.delete(`/api/admin/media/${id}`);
```

- [ ] **Step 3: Extend next.config.mjs with `/uploads/:path*` cache header**

Open `next.config.mjs`. In the `headers()` function, find the static-asset block (the one with `source: "/_next/static/:path*"`). Add a new entry right after it:

```js
{
  source: "/uploads/:path*",
  locale: false,
  headers: [
    {
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    },
  ],
},
```

Also add `"/uploads/:path*.(png|jpg|jpeg|webp|avif|svg|ico|gif)"` to the existing image-extension block if it's separate. The simpler approach is the new entry above.

- [ ] **Step 4: Update .gitignore**

Append to `.gitignore`:

```
public/uploads/
```

(The directory itself and all its contents should be untracked.)

- [ ] **Step 5: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/components/admin/AdminSidebar.tsx src/apihelper/admin.ts next.config.mjs .gitignore && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(media): sidebar entry, helpers, cache header, gitignore"
```

Expected: `✓ Compiled successfully`.

---

## Task 11: Sweep — `/admin/settings` + `/admin/social-contact`

**Files:**
- Modify: `src/app/(admin)/admin/settings/page.tsx`
- Modify: `src/app/(admin)/admin/social-contact/page.tsx`

These two pages use `CmsForm` with `type: "url"` fields for image URLs. Convert each `type: "url"` to `type: "url", image: true, imageKind: "image"` (or `imageKind: "video"` for video URLs). Since CmsForm supports the new `image` flag, this is a one-line change per field.

- [ ] **Step 1: Edit settings page**

Open `src/app/(admin)/admin/settings/page.tsx`. In the `fields` array, find entries like `{ name: "logoUrl", label: "Header Logo URL", type: "url" }` and add `, image: true` to them. Specifically:

```ts
{ name: "logoUrl", label: "Header Logo URL", type: "url", image: true },
{ name: "footerLogoUrl", label: "Footer Logo URL", type: "url", image: true },
{ name: "faviconUrl", label: "Favicon URL", type: "url", image: true },
{ name: "appleTouchIconUrl", label: "Apple Touch Icon URL", type: "url", image: true },
{ name: "ogImage", label: "Default OG Image URL", type: "url", image: true },
```

(If a field already has additional props, just add `image: true`. The other fields like `homeSeoTitle`, `homeSeoDescription`, `homeSeoKeywords`, `contactEmail`, `contactPhone`, `headerCtaText`, `headerCtaLink`, etc. are NOT images — leave them.)

- [ ] **Step 2: Edit social-contact page**

Open `src/app/(admin)/admin/social-contact/page.tsx`. If it uses CmsForm with `type: "url"` fields, add `image: true` to each (this page is for social URLs, not images, so probably no changes needed — verify).

- [ ] **Step 3: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/app/\(admin\)/admin/settings/page.tsx src/app/\(admin\)/admin/social-contact/page.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin): media picker on settings + social-contact image URLs"
```

Expected: `✓ Compiled successfully`.

---

## Task 12: Sweep — `/admin/page-banner` + `/admin/cms/banners` (home) + `/admin/about-us/*`

**Files:**
- Modify: `src/app/(admin)/admin/page-banner/page.tsx`
- Modify: `src/app/(admin)/admin/cms/banners/page.tsx`
- Modify: `src/app/(admin)/admin/about-us/banner/page.tsx`
- Modify: `src/app/(admin)/admin/about-us/about-brpl/page.tsx`
- Modify: `src/app/(admin)/admin/about-us/mission-vision/page.tsx`
- Modify: `src/app/(admin)/admin/about-us/meet-our-team/page.tsx`
- Modify: `src/app/(admin)/admin/cms/who-we-are/page.tsx`

These pages don't all use `CmsForm`. They have hand-written forms with `<Input type="url">` for image fields. The pattern is the same: replace the `<Input type="url">` block for image fields with `<MediaUploadField value={...} onChange={...} kind="image" />`. Keep the same wrapping `<div>` and `<Label>`.

- [ ] **Step 1: For each file, identify the image-URL inputs**

For each page, find the input that handles an `image` field (e.g. `banner.image`, `aboutBrpl.image`, `missionVision.image`, `meetOurTeam.image`, `homeCms.banners[i].image`, `homeCms.broadcastingPartners[i].logo`, etc.). Replace just that input with:

```tsx
<MediaUploadField
    label="Image URL"
    value={/* the current value */}
    onChange={(v) => /* update state */}
    kind="image"
/>
```

Keep all surrounding form structure (cards, labels, save buttons, etc.) unchanged. Add the import at the top:

```ts
import { MediaUploadField } from "@/components/admin/MediaUploadField";
```

For the home page (`cms/banners/page.tsx`), the broadcastPartners `logo` field is also an image — convert it too.

- [ ] **Step 2: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/app/\(admin\)/admin/page-banner/page.tsx src/app/\(admin\)/admin/cms/banners/page.tsx src/app/\(admin\)/admin/cms/who-we-are/page.tsx src/app/\(admin\)/admin/about-us/ && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin): media picker on banner + home + about-us image URLs"
```

Expected: `✓ Compiled successfully`.

---

## Task 13: Sweep — registration sub-pages + collections

**Files:**
- Modify: `src/app/(admin)/admin/registration-page/page.tsx`
- Modify: `src/app/(admin)/admin/registration-hero/page.tsx`
- Modify: `src/app/(admin)/admin/registration-banner/page.tsx`
- Modify: `src/app/(admin)/admin/numbers-speak/page.tsx`
- Modify: `src/app/(admin)/admin/roadmap/page.tsx`
- Modify: `src/app/(admin)/admin/zone-deadline/page.tsx`
- Modify: `src/app/(admin)/admin/player-stories/page.tsx`
- Modify: `src/app/(admin)/admin/registration-faqs/page.tsx`

These pages have forms with arrays of objects that contain image/video URL inputs.

- [ ] **Step 1: For each file, identify image/video URL inputs**

Specifically:
- `registration-page/page.tsx`: `videos[i].url` (video) and `videos[i].thumbnail` (image)
- `registration-hero/page.tsx`: `hero.image` (image), `hero.videoUrl` (video)
- `registration-banner/page.tsx`: `banner.image` (image)
- `numbers-speak/page.tsx`: `numbersSpeak[i].icon` (image — small emoji/icon)
- `roadmap/page.tsx`: no images, just text
- `zone-deadline/page.tsx`: no images
- `player-stories/page.tsx`: `playerStories[i].image` (image)
- `registration-faqs/page.tsx`: no images

For each input found, replace with `<MediaUploadField kind="video" | "image" />` matching the field type. Use the same wrapping pattern as Task 12.

- [ ] **Step 2: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/app/\(admin\)/admin/registration-page/ src/app/\(admin\)/admin/registration-hero/ src/app/\(admin\)/admin/registration-banner/ src/app/\(admin\)/admin/numbers-speak/ src/app/\(admin\)/admin/player-stories/ && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin): media picker on registration sub-pages"
```

Expected: `✓ Compiled successfully`.

---

## Task 14: Sweep — collection admins (events/jobs/ambassadors/teams/partners/blog/news)

**Files:**
- Modify: `src/app/(admin)/admin/events/page.tsx`
- Modify: `src/app/(admin)/admin/jobs/create/page.tsx`
- Modify: `src/app/(admin)/admin/jobs/edit/[id]/page.tsx`
- Modify: `src/app/(admin)/admin/ambassadors/page.tsx`
- Modify: `src/app/(admin)/admin/teams/page.tsx`
- Modify: `src/app/(admin)/admin/partners/page.tsx`
- Modify: `src/app/(admin)/admin/blog/page.tsx`
- Modify: `src/app/(admin)/admin/news/page.tsx`

These admin pages manage `events`, `jobs`, `ambassadors`, `teamMembers`, `partners`, `blogPosts`, `newsArticles` — each has an `image` (or `logo` for partners, `heroImage` for blog/news) field on the create/edit form.

- [ ] **Step 1: For each file, identify the image URL input**

For each file, find the input that handles the image field. Replace with `<MediaUploadField kind="image" />`. Same pattern as Task 12/13.

- [ ] **Step 2: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/app/\(admin\)/admin/events/ src/app/\(admin\)/admin/jobs/ src/app/\(admin\)/admin/ambassadors/ src/app/\(admin\)/admin/teams/ src/app/\(admin\)/admin/partners/ src/app/\(admin\)/admin/blog/ src/app/\(admin\)/admin/news/ && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin): media picker on collection admins"
```

Expected: `✓ Compiled successfully`.

---

## Task 15: Sweep — `/admin/site-pages`

**Files:**
- Modify: `src/app/(admin)/admin/site-pages/page.tsx`

The site-pages admin already has a `heroImage` field per tab. Convert it to `<MediaUploadField>`.

- [ ] **Step 1: Replace the image input**

Open `src/app/(admin)/admin/site-pages/page.tsx`. Find the `<Input value={data.heroImage || ""} onChange={(e) => set("heroImage", e.target.value)} ... />` (or similar) and replace with:

```tsx
<MediaUploadField
    label="Hero Image URL"
    value={data.heroImage || ""}
    onChange={(v) => set("heroImage", v)}
    kind="image"
/>
```

Add the import at the top:

```ts
import { MediaUploadField } from "@/components/admin/MediaUploadField";
```

- [ ] **Step 2: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/app/\(admin\)/admin/site-pages/page.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin): media picker on site-pages hero image"
```

Expected: `✓ Compiled successfully`.

---

## Task 16: Wire media slice into `siteContext.ts`

**Files:**
- Modify: `src/lib/siteContext.ts`

Although the public site doesn't render media directly (URLs are inlined in CMS field values), add the slice so a future `useMedia()` selector hook is available.

- [ ] **Step 1: Add Media slice**

Open `src/lib/siteContext.ts`. Add an import at the top:

```ts
import Media from "@/models/Media";
```

Add to the `SiteContext` type (after `collections`):

```ts
    media: {
        items: any[];
        folders: string[];
    };
```

In the `defaults()` function, add `media: { items: [], folders: [] },` to the returned object.

Add a per-slice reader and cache wrapper (alongside the existing ones):

```ts
async function readMedia(): Promise<any> {
    try {
        await connectDB();
        const [items, folders] = await Promise.all([
            Media.find({}).sort({ createdAt: -1 }).limit(200).lean(),
            Media.distinct("folder", { folder: { $ne: null, $ne: "" } }),
        ]);
        return {
            items: items.map((m) => ({ ...m, _id: m._id.toString() })),
            folders: folders.filter((f): f is string => typeof f === "string" && f.length > 0).sort(),
        };
    } catch {
        return { items: [], folders: [] };
    }
}

const cachedMedia = unstable_cache(readMedia, ["site-context-media"], { tags: [TAGS.MEDIA, TAGS.ALL] });
```

Add to the `build()` Promise.all:

```ts
const media = await cachedMedia();
```

And in the returned object, add `media,`.

Add an exported getter:

```ts
export async function getMedia() { return cachedMedia(); }
```

Update `getSiteContextSlice` if needed — the new slice will fall through to the default branch (calls cachedAll), which is fine.

- [ ] **Step 2: Verify build + commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10
git add src/lib/siteContext.ts && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(site-context): add Media slice"
```

Expected: `✓ Compiled successfully`.

---

## Task 17: Manual smoke test

- [ ] **Step 1: Upload from settings**

1. Start `npm run dev` and visit `http://localhost:3000/admin/login`.
2. Log in (`admin@brpl.com` / `Admin@123`).
3. Go to `/admin/settings`. Confirm the Logo URL field now has an "Upload" button next to it. Click → drag a PNG → see progress bar → see thumbnail + URL populated.
4. Save the form. Reload — thumbnail persists.

- [ ] **Step 2: Library round-trip**

1. Visit `/admin/media`. Should show empty state initially.
2. Drag a few images onto the drop zone. They appear in the grid with thumbnails.
3. Refresh — they're still there.

- [ ] **Step 3: Picker integration**

1. Go to `/admin/page-banner`. Click "Add banner". In the new banner's image field, click "Library". Modal opens. Pick an existing image. Modal closes, field has URL, preview shows.

- [ ] **Step 4: External URL still works**

1. Paste `https://placehold.co/600x400` into any URL field. Save. Public site shows that image.

- [ ] **Step 5: Wrong MIME rejected**

1. Try uploading a `.pdf` via the picker. Server rejects with 415, UI shows toast.

- [ ] **Step 6: Oversize rejected**

1. Try uploading a 10 MB image. Server rejects with 413.

- [ ] **Step 7: Public rendering**

1. Visit `/`. Confirm the uploaded logo shows in the header. Hard-refresh — still there.

- [ ] **Step 8: Filesystem**

1. `ls public/uploads/2026/06/` shows uploaded files with sensible names (random UUID prefix).

- [ ] **Step 9: Delete**

1. In `/admin/media`, click delete on an upload. Confirm file gone from disk and Media doc gone.

- [ ] **Step 10: Sharp resize**

1. Upload a 4000px-wide image. Confirm the saved file on disk is < 2 MB and 1920px wide. Open the page in browser and inspect network — `next/image` serves the webp variant.

- [ ] **Step 11: Folder organization**

1. Upload into "Hero Banners" folder (use the `folder` form field in the picker upload tab). In library, filter by that folder. Only matching items appear.

- [ ] **Step 12: Search**

1. Upload 10 items with various filenames. In the library search, type "hero". Matching items filter.

- [ ] **Step 13: Commit final**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add -A && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "chore: verified Phase 2 file uploads + media library"
```

---

## Self-Review

1. **Spec coverage:**
   - Storage backend (local disk, sharp, public/uploads) → Tasks 1, 3 ✓
   - Media model → Task 2 ✓
   - Cache tag MEDIA → Task 3 ✓
   - Upload API → Task 4 ✓
   - List / folders / item API → Task 5 ✓
   - MediaPicker component → Task 6 ✓
   - MediaUploadField component → Task 7 ✓
   - CmsForm image extension → Task 8 ✓
   - Library page → Task 9 ✓
   - Sidebar + helpers + cache header + gitignore → Task 10 ✓
   - Form sweep (settings, social-contact, page-banner, home, about-us, registration sub-pages, collections, site-pages) → Tasks 11-15 ✓
   - Media slice in siteContext → Task 16 ✓
   - Verification → Task 17 ✓
   - **No gaps.**

2. **Placeholder scan:** No "TBD" or "TODO" in any step. Every code block is concrete.

3. **Type consistency:**
   - `MediaItem` shape defined in `MediaPicker.tsx` matches the API response in Tasks 4/5.
   - `MediaUploadField` props (`value`, `onChange`, `kind`) match the way CmsForm calls them in Task 8.
   - `CmsField.image` / `imageKind` types defined and used consistently across Tasks 8 and 11-15.
   - `uploadMedia/listMedia/listMediaFolders/updateMedia/deleteMedia` helper signatures in Task 10 are referenced consistently.

---

## Plan Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-24-cms-phase2-uploads.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session, batch execution with checkpoints for review.

**Which approach?**