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

    useEffect(() => { load(); }, [folder, kind, search, page]);

    async function load() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (folder) params.set("folder", folder);
            if (kind !== "all") params.set("kind", kind);
            if (search) params.set("search", search);
            params.set("page", String(page));
            params.set("limit", "24");
            const qs = params.toString();
            const r = await api.get(`/api/admin/media${qs ? `?${qs}` : ""}`);
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