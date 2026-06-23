"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { getHomeSection, updateHomeSection } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";

type Banner = { title: string; subtitle: string; image: string; videoUrl: string; ctaText: string; ctaLink: string; order: number; active?: boolean };

export default function HomeBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getHomeSection("banners");
                if (res.ok && Array.isArray(res.data?.data)) {
                    setBanners(res.data.data);
                }
            } catch {
                toast({ variant: "destructive", title: "Error", description: "Failed to load" });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const save = async () => {
        setSaving(true);
        try {
            const res = await updateHomeSection("banners", banners);
            if (res.ok) toast({ title: "Success", description: "Banners saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    const add = () => setBanners([...banners, blankBanner()]);
    const remove = (i: number) => setBanners(banners.filter((_, idx) => idx !== i));
    const update = (i: number, k: keyof Banner, v: any) =>
        setBanners(banners.map((b, idx) => (idx === i ? { ...b, [k]: v } : b)));

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Home Banners</h1>
                    <p className="text-slate-500 mt-1">Hero carousel banners on the home page.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={add} variant="outline">
                        <Plus className="w-4 h-4 mr-2" /> Add banner
                    </Button>
                    <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                    </Button>
                </div>
            </div>

            {banners.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-slate-500">No banners. Click "Add banner" to create one.</CardContent></Card>
            ) : (
                <div className="space-y-4">
                    {banners.map((b, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base">Banner #{i + 1}</CardTitle>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(i)}>
                                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                                </Button>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="md:col-span-2"><Label>Title</Label><Input value={b.title || ""} onChange={(e) => update(i, "title", e.target.value)} /></div>
                                <div className="md:col-span-2"><Label>Subtitle</Label><Textarea rows={2} value={b.subtitle || ""} onChange={(e) => update(i, "subtitle", e.target.value)} /></div>
                                <div className="md:col-span-2"><Label>Image URL</Label><Input value={b.image || ""} onChange={(e) => update(i, "image", e.target.value)} placeholder="https://..." /></div>
                                {b.image && <div className="md:col-span-2"><img src={b.image} alt="" className="max-h-32 rounded border" /></div>}
                                <div><Label>Video URL (optional)</Label><Input value={b.videoUrl || ""} onChange={(e) => update(i, "videoUrl", e.target.value)} /></div>
                                <div><Label>Order</Label><Input type="number" value={b.order ?? 0} onChange={(e) => update(i, "order", Number(e.target.value))} /></div>
                                <div><Label>CTA Text</Label><Input value={b.ctaText || ""} onChange={(e) => update(i, "ctaText", e.target.value)} /></div>
                                <div><Label>CTA Link</Label><Input value={b.ctaLink || ""} onChange={(e) => update(i, "ctaLink", e.target.value)} /></div>
                                <div className="md:col-span-2 flex items-center gap-2">
                                    <Switch checked={Boolean(b.active)} onCheckedChange={(v) => update(i, "active", v)} />
                                    <Label>Active</Label>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function blankBanner(): Banner {
    return { title: "", subtitle: "", image: "", videoUrl: "", ctaText: "", ctaLink: "", order: 0, active: true };
}
