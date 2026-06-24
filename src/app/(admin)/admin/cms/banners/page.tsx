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
import { MediaUploadField } from "@/components/admin/MediaUploadField";

type Banner = { title: string; subtitle: string; image: string; videoUrl: string; ctaText: string; ctaLink: string; order: number; active?: boolean };
type TrustItem = { label: string; value: string; icon?: string; order?: number };
type Partner = { name: string; logo: string; website?: string; order?: number };

export default function HomeBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [trustBar, setTrustBar] = useState<TrustItem[]>([]);
    const [broadcastingPartners, setBroadcastingPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getHomeSection("banners");
                if (res.ok && res.data?.data) {
                    const data = res.data.data;
                    if (Array.isArray(data.banners)) setBanners(data.banners);
                    if (Array.isArray(data.trustBar)) setTrustBar(data.trustBar);
                    if (Array.isArray(data.broadcastingPartners))
                        setBroadcastingPartners(data.broadcastingPartners);
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
            const res = await updateHomeSection("banners", {
                banners,
                trustBar,
                broadcastingPartners,
            });
            if (res.ok) toast({ title: "Success", description: "Home page sections saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Home Page</h1>
                    <p className="text-slate-500 mt-1">Banners, trust bar, and broadcasting partners.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save all sections
                    </Button>
                </div>
            </div>

            <BannersSection banners={banners} setBanners={setBanners} />
            <TrustBarSection items={trustBar} setItems={setTrustBar} />
            <BroadcastingPartnersSection items={broadcastingPartners} setItems={setBroadcastingPartners} />
        </div>
    );
}

/* ----------------------------- Banners ----------------------------- */

function BannersSection({
    banners,
    setBanners,
}: {
    banners: Banner[];
    setBanners: (b: Banner[]) => void;
}) {
    const add = () => setBanners([...banners, blankBanner()]);
    const remove = (i: number) => setBanners(banners.filter((_, idx) => idx !== i));
    const update = (i: number, k: keyof Banner, v: any) =>
        setBanners(banners.map((b, idx) => (idx === i ? { ...b, [k]: v } : b)));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Hero Banners</h2>
                <Button onClick={add} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Add banner
                </Button>
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
                                <div className="md:col-span-2"><MediaUploadField label="Image URL" value={b.image || ""} onChange={(v) => update(i, "image", v)} kind="image" /></div>
                                {b.image && <div className="md:col-span-2"><img src={b.image} alt="" className="max-h-32 rounded border" /></div>}
                                <div className="md:col-span-2"><MediaUploadField label="Video URL (optional)" value={b.videoUrl || ""} onChange={(v) => update(i, "videoUrl", v)} kind="video" /></div>
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

/* ----------------------------- Trust Bar ----------------------------- */

function TrustBarSection({
    items,
    setItems,
}: {
    items: TrustItem[];
    setItems: (v: TrustItem[]) => void;
}) {
    const add = () => setItems([...items, blankTrust()]);
    const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const update = (i: number, k: keyof TrustItem, v: any) =>
        setItems(items.map((b, idx) => (idx === i ? { ...b, [k]: v } : b)));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Trust Bar</h2>
                    <p className="text-xs text-slate-500">Key/value statistics shown beneath the hero.</p>
                </div>
                <Button onClick={add} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Add item
                </Button>
            </div>
            {items.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-slate-500 text-sm">No trust bar items.</CardContent></Card>
            ) : (
                <Card>
                    <CardContent className="space-y-3 pt-6">
                        {items.map((it, i) => (
                            <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                                <div>
                                    <Label className="text-xs">Label</Label>
                                    <Input value={it.label || ""} onChange={(e) => update(i, "label", e.target.value)} placeholder="Teams" />
                                </div>
                                <div>
                                    <Label className="text-xs">Value</Label>
                                    <Input value={it.value || ""} onChange={(e) => update(i, "value", e.target.value)} placeholder="32" />
                                </div>
                                <div>
                                    <Label className="text-xs">Icon (optional)</Label>
                                    <Input value={it.icon || ""} onChange={(e) => update(i, "icon", e.target.value)} placeholder="trophy" />
                                </div>
                                <div className="w-20">
                                    <Label className="text-xs">Order</Label>
                                    <Input type="number" value={it.order ?? 0} onChange={(e) => update(i, "order", Number(e.target.value))} />
                                </div>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(i)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function blankTrust(): TrustItem {
    return { label: "", value: "", icon: "", order: 0 };
}

/* ----------------------------- Broadcasting Partners ----------------------------- */

function BroadcastingPartnersSection({
    items,
    setItems,
}: {
    items: Partner[];
    setItems: (v: Partner[]) => void;
}) {
    const add = () => setItems([...items, blankPartner()]);
    const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const update = (i: number, k: keyof Partner, v: any) =>
        setItems(items.map((b, idx) => (idx === i ? { ...b, [k]: v } : b)));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Broadcasting Partners</h2>
                    <p className="text-xs text-slate-500">Logos and links to broadcast/streaming partners.</p>
                </div>
                <Button onClick={add} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Add partner
                </Button>
            </div>
            {items.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-slate-500 text-sm">No broadcasting partners.</CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {items.map((p, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between py-3">
                                <CardTitle className="text-sm">Partner #{i + 1}</CardTitle>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(i)}>
                                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                                </Button>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label>Name</Label>
                                    <Input value={p.name || ""} onChange={(e) => update(i, "name", e.target.value)} placeholder="Star Sports" />
                                </div>
                                <div className="md:col-span-2">
                                    <MediaUploadField label="Logo URL" value={p.logo || ""} onChange={(v) => update(i, "logo", v)} kind="image" />
                                </div>
                                {p.logo && (
                                    <div className="md:col-span-2">
                                        <img src={p.logo} alt={p.name || ""} className="max-h-20 rounded border bg-white p-2" />
                                    </div>
                                )}
                                <div>
                                    <Label>Website (optional)</Label>
                                    <Input value={p.website || ""} onChange={(e) => update(i, "website", e.target.value)} placeholder="https://..." />
                                </div>
                                <div>
                                    <Label>Order</Label>
                                    <Input type="number" value={p.order ?? 0} onChange={(e) => update(i, "order", Number(e.target.value))} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function blankPartner(): Partner {
    return { name: "", logo: "", website: "", order: 0 };
}
