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
            const params = new URLSearchParams();
            if (folder) params.set("folder", folder);
            if (kind !== "any") params.set("kind", kind);
            if (search) params.set("search", search);
            params.set("page", String(page));
            params.set("limit", "24");
            const qs = params.toString();
            const r = await api.get(`/api/admin/media${qs ? `?${qs}` : ""}`);
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