"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { getRegistrationSection, updateRegistrationSection } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";

type Step = { step: string; description?: string; order?: number };

export default function RoadmapPage() {
    const [items, setItems] = useState<Step[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getRegistrationSection("roadmap");
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
            const res = await updateRegistrationSection("roadmap", items);
            if (res.ok) toast({ title: "Success", description: "Saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    const add = () => setItems([...items, { step: "", description: "", order: items.length }]);
    const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const update = (i: number, k: keyof Step, v: any) =>
        setItems(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Journey Roadmap</h1>
                    <p className="text-slate-500 mt-1">Step-by-step journey for players on the registration page.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={add} variant="outline"><Plus className="w-4 h-4 mr-2" /> Add step</Button>
                    <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                    </Button>
                </div>
            </div>

            {items.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-slate-500">No steps yet.</CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {items.map((s, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base">Step #{i + 1}</CardTitle>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(i)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-2"><Label>Step Title</Label><Input value={s.step} onChange={(e) => update(i, "step", e.target.value)} /></div>
                                <div><Label>Order</Label><Input type="number" value={s.order ?? 0} onChange={(e) => update(i, "order", Number(e.target.value))} /></div>
                                <div className="md:col-span-3"><Label>Description</Label><Textarea rows={2} value={s.description || ""} onChange={(e) => update(i, "description", e.target.value)} /></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
