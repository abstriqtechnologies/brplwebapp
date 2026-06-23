"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { listPageBanners, upsertPageBanner, updatePageBanner, deletePageBanner } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

const COMMON_KEYS = [
    "about-us",
    "registration",
    "contact-us",
    "career",
    "blog",
    "news",
    "events",
    "teams",
    "faqs",
    "partners",
];

export default function PageBannerPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState<any>(emptyBanner());
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await listPageBanners();
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
        setForm(emptyBanner());
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
            const res = editing
                ? await updatePageBanner(editing._id, form)
                : await upsertPageBanner(form);
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
        if (!confirm(`Delete banner "${b.key}"?`)) return;
        try {
            const res = await deletePageBanner(b._id);
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
                    <h1 className="text-3xl font-bold">Page Banners</h1>
                    <p className="text-slate-500 mt-1">Hero banners for inner pages, keyed by URL slug.</p>
                </div>
                <Button onClick={openCreate} className="bg-amber-500 text-black hover:bg-amber-400">
                    <Plus className="w-4 h-4 mr-2" />
                    Add banner
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div className="md:col-span-3 text-slate-500">Suggested keys: {COMMON_KEYS.join(", ")}</div>
            </div>

            {loading ? (
                <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></div>
            ) : items.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-slate-500">No banners yet. Add one to get started.</CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((b) => (
                        <Card key={b._id}>
                            {b.image && (
                                <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden">
                                    <img src={b.image} alt={b.key} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{b.key}</code>
                                    <Badge variant={b.active ? "default" : "secondary"}>{b.active ? "Active" : "Inactive"}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <h3 className="font-bold mb-1">{b.title || "Untitled"}</h3>
                                {b.subtitle && <p className="text-sm text-slate-500 line-clamp-2 mb-2">{b.subtitle}</p>}
                                <div className="flex gap-2 pt-2">
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
                        <DialogTitle>{editing ? "Edit banner" : "Add banner"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label>Page key *</Label>
                                <Input
                                    required
                                    value={form.key || ""}
                                    onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase() })}
                                    placeholder="about-us"
                                    disabled={Boolean(editing)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Title</Label>
                                <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Subtitle</Label>
                                <Textarea rows={2} value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Image URL</Label>
                                <Input value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
                            </div>
                            <div>
                                <Label>CTA Text</Label>
                                <Input value={form.ctaText || ""} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} />
                            </div>
                            <div>
                                <Label>CTA Link</Label>
                                <Input value={form.ctaLink || ""} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} />
                            </div>
                            <div className="flex items-center gap-2 md:col-span-2">
                                <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                                <Label>Active</Label>
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

function emptyBanner() {
    return { key: "", title: "", subtitle: "", image: "", ctaText: "", ctaLink: "", active: true };
}
