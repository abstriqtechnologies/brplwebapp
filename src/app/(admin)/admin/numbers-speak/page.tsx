"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { getRegistrationSection, updateRegistrationSection } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";

type Stat = { label: string; value: string; icon?: string; order?: number };

export default function NumbersSpeakPage() {
    const [items, setItems] = useState<Stat[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getRegistrationSection("numbers-speak");
                if (res.ok && Array.isArray(res.data?.data)) setItems(res.data.data);
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
            const res = await updateRegistrationSection("numbers-speak", items);
            if (res.ok) toast({ title: "Success", description: "Saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    const add = () => setItems([...items, { label: "", value: "", icon: "", order: items.length }]);
    const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const update = (i: number, k: keyof Stat, v: any) =>
        setItems(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Numbers Speak</h1>
                    <p className="text-slate-500 mt-1">Big-number stat cards on the registration page.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={add} variant="outline"><Plus className="w-4 h-4 mr-2" /> Add stat</Button>
                    <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                    </Button>
                </div>
            </div>

            {items.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-slate-500">No stats yet.</CardContent></Card>
            ) : (
                <Card>
                    <CardContent className="pt-6 space-y-3">
                        {items.map((s, i) => (
                            <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                <div><Label className="text-xs">Icon (emoji)</Label><Input value={s.icon || ""} onChange={(e) => update(i, "icon", e.target.value)} /></div>
                                <div><Label className="text-xs">Label</Label><Input value={s.label} onChange={(e) => update(i, "label", e.target.value)} /></div>
                                <div><Label className="text-xs">Value</Label><Input value={s.value} onChange={(e) => update(i, "value", e.target.value)} /></div>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1"><Label className="text-xs">Order</Label><Input type="number" value={s.order ?? 0} onChange={(e) => update(i, "order", Number(e.target.value))} /></div>
                                    <Button size="icon" variant="ghost" className="text-red-600" onClick={() => remove(i)}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
