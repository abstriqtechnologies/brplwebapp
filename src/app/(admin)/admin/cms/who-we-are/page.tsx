"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { getHomeSection, updateHomeSection } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";
import { MediaUploadField } from "@/components/admin/MediaUploadField";

type WhoWeAre = {
    title?: string;
    subtitle?: string;
    body?: string;
    image?: string;
    points?: { icon?: string; title: string; description: string; order?: number }[];
};

export default function WhoWeArePage() {
    const [data, setData] = useState<WhoWeAre>({ title: "", subtitle: "", body: "", image: "", points: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getHomeSection("who-we-are");
                if (res.ok && res.data?.data) setData(res.data.data);
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
            const res = await updateHomeSection("who-we-are", data);
            if (res.ok) toast({ title: "Success", description: "Saved" });
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Who We Are</h1>
                    <p className="text-slate-500 mt-1">Home page "Who We Are" section.</p>
                </div>
                <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                </Button>
            </div>

            <Card>
                <CardHeader><CardTitle>Section</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Title</Label><Input value={data.title || ""} onChange={(e) => setData({ ...data, title: e.target.value })} /></div>
                    <div><Label>Subtitle</Label><Input value={data.subtitle || ""} onChange={(e) => setData({ ...data, subtitle: e.target.value })} /></div>
                    <div className="md:col-span-2"><Label>Body</Label><Textarea rows={4} value={data.body || ""} onChange={(e) => setData({ ...data, body: e.target.value })} /></div>
                    <div className="md:col-span-2"><MediaUploadField label="Image URL" value={data.image || ""} onChange={(v) => setData({ ...data, image: v })} kind="image" /></div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Points</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setData({ ...data, points: [...(data.points || []), { title: "", description: "", icon: "", order: (data.points?.length || 0) }] })}>
                        <Plus className="w-4 h-4 mr-1" /> Add point
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    {(data.points || []).length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No points yet.</p>
                    ) : (
                        data.points!.map((p, i) => (
                            <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-500">#{i + 1}</span>
                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setData({ ...data, points: data.points!.filter((_, idx) => idx !== i) })}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div><Label className="text-xs">Icon (emoji or text)</Label><Input value={p.icon || ""} onChange={(e) => updatePoint(i, "icon", e.target.value)} /></div>
                                    <div><Label className="text-xs">Order</Label><Input type="number" value={p.order ?? 0} onChange={(e) => updatePoint(i, "order", Number(e.target.value))} /></div>
                                    <div className="md:col-span-2"><Label className="text-xs">Title</Label><Input value={p.title} onChange={(e) => updatePoint(i, "title", e.target.value)} /></div>
                                    <div className="md:col-span-2"><Label className="text-xs">Description</Label><Textarea rows={2} value={p.description} onChange={(e) => updatePoint(i, "description", e.target.value)} /></div>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );

    function updatePoint(idx: number, key: string, value: any) {
        const points = [...(data.points || [])];
        points[idx] = { ...points[idx], [key]: value };
        setData({ ...data, points });
    }
}
