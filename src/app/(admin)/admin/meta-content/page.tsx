"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { listSeo, upsertSeo, updateSeo, deleteSeo } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";

export default function MetaContentPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState<any>(emptySeo());
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await listSeo();
            if (res.ok && res.data) setItems(res.data.items);
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to load" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm(emptySeo());
        setDialogOpen(true);
    };

    const openEdit = (b: any) => {
        setEditing(b);
        setForm({ ...b });
        setDialogOpen(true);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = editing ? await updateSeo(editing._id, form) : await upsertSeo(form);
            if (res.ok) {
                toast({ title: "Success", description: "Saved" });
                setDialogOpen(false);
                load();
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed" });
        } finally {
            setSaving(false);
        }
    };

    const remove = async (b: any) => {
        if (!confirm(`Delete SEO for "${b.path}"?`)) return;
        try {
            const res = await deleteSeo(b._id);
            if (res.ok) {
                toast({ title: "Success", description: "Deleted" });
                load();
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed" });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Meta Content (SEO)</h1>
                    <p className="text-slate-500 mt-1">Title, description, OG tags for each public page.</p>
                </div>
                <Button onClick={openCreate} className="bg-amber-500 text-black hover:bg-amber-400">
                    <Plus className="w-4 h-4 mr-2" />
                    Add meta
                </Button>
            </div>

            {loading ? (
                <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></div>
            ) : items.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-slate-500">No SEO entries yet.</CardContent></Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((b) => (
                        <Card key={b._id}>
                            <CardHeader>
                                <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block w-fit">{b.path}</code>
                            </CardHeader>
                            <CardContent>
                                <h3 className="font-bold line-clamp-1 mb-1">{b.title}</h3>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-3">{b.description}</p>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                                        <Pencil className="w-3 h-3 mr-1" /> Edit
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => remove(b)}>
                                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit SEO entry" : "Add SEO entry"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label>Path *</Label>
                                <Input
                                    required
                                    value={form.path || ""}
                                    onChange={(e) => setForm({ ...form, path: e.target.value.toLowerCase() })}
                                    placeholder="/about-us"
                                    disabled={Boolean(editing)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Title *</Label>
                                <Input required value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Description *</Label>
                                <Textarea required rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Keywords (comma-separated)</Label>
                                <Input value={form.keywords || ""} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
                            </div>
                            <div>
                                <Label>OG Type</Label>
                                <Input value={form.ogType || "website"} onChange={(e) => setForm({ ...form, ogType: e.target.value })} />
                            </div>
                            <div>
                                <Label>Twitter Card</Label>
                                <Input value={form.twitterCard || "summary_large_image"} onChange={(e) => setForm({ ...form, twitterCard: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <Label>OG Image URL</Label>
                                <Input value={form.ogImage || ""} onChange={(e) => setForm({ ...form, ogImage: e.target.value })} placeholder="https://..." />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Canonical URL</Label>
                                <Input value={form.canonical || ""} onChange={(e) => setForm({ ...form, canonical: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Robots</Label>
                                <Input value={form.robots || "index, follow"} onChange={(e) => setForm({ ...form, robots: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {editing ? "Save changes" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function emptySeo() {
    return { path: "", title: "", description: "", keywords: "", ogImage: "", ogType: "website", twitterCard: "summary_large_image", canonical: "", robots: "index, follow" };
}
