"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { getAboutSection, updateAboutSection } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";

type Stat = { label: string; value: string; order?: number };
type AboutBrpl = { title?: string; body?: string; image?: string; stats?: Stat[] };

export default function AboutBrplPage() {
    const [data, setData] = useState<AboutBrpl>({ title: "", body: "", image: "", stats: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getAboutSection("about-brpl");
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
            const res = await updateAboutSection("about-brpl", data);
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
                    <h1 className="text-3xl font-bold">About BRPL</h1>
                    <p className="text-slate-500 mt-1">Main "About BRPL" section content.</p>
                </div>
                <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                </Button>
            </div>

            <Card>
                <CardHeader><CardTitle>Content</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Title</Label><Input value={data.title || ""} onChange={(e) => setData({ ...data, title: e.target.value })} /></div>
                    <div className="md:col-span-2"><Label>Image URL</Label><Input value={data.image || ""} onChange={(e) => setData({ ...data, image: e.target.value })} /></div>
                    <div className="md:col-span-2"><Label>Body</Label><Textarea rows={6} value={data.body || ""} onChange={(e) => setData({ ...data, body: e.target.value })} /></div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Stats</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setData({ ...data, stats: [...(data.stats || []), { label: "", value: "", order: (data.stats?.length || 0) }] })}>
                        <Plus className="w-4 h-4 mr-1" /> Add stat
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    {(data.stats || []).length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No stats yet.</p>
                    ) : (
                        (data.stats || []).map((s, i) => (
                            <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                <div className="md:col-span-1"><Label className="text-xs">Label</Label><Input value={s.label} onChange={(e) => updateStat(i, "label", e.target.value)} /></div>
                                <div><Label className="text-xs">Value</Label><Input value={s.value} onChange={(e) => updateStat(i, "value", e.target.value)} /></div>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1"><Label className="text-xs">Order</Label><Input type="number" value={s.order ?? 0} onChange={(e) => updateStat(i, "order", Number(e.target.value))} /></div>
                                    <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setData({ ...data, stats: data.stats!.filter((_, idx) => idx !== i) })}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );

    function updateStat(idx: number, key: keyof Stat, value: any) {
        const stats = [...(data.stats || [])];
        stats[idx] = { ...stats[idx], [key]: value };
        setData({ ...data, stats });
    }
}
