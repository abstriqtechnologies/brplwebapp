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

type Story = { name: string; role?: string; story: string; image?: string; order?: number };

export default function PlayerStoriesPage() {
    const [items, setItems] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getRegistrationSection("player-stories");
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
            const res = await updateRegistrationSection("player-stories", items);
            if (res.ok) toast({ title: "Success", description: "Saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    const add = () => setItems([...items, { name: "", role: "", story: "", image: "", order: items.length }]);
    const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const update = (i: number, k: keyof Story, v: any) =>
        setItems(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Player Stories</h1>
                    <p className="text-slate-500 mt-1">Testimonials from past players.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={add} variant="outline"><Plus className="w-4 h-4 mr-2" /> Add story</Button>
                    <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                    </Button>
                </div>
            </div>

            {items.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-slate-500">No stories yet.</CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {items.map((s, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base">Story #{i + 1}</CardTitle>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(i)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div><Label>Player Name</Label><Input value={s.name} onChange={(e) => update(i, "name", e.target.value)} /></div>
                                <div><Label>Role / Position</Label><Input value={s.role || ""} onChange={(e) => update(i, "role", e.target.value)} /></div>
                                <div className="md:col-span-2"><Label>Image URL</Label><Input value={s.image || ""} onChange={(e) => update(i, "image", e.target.value)} /></div>
                                <div className="md:col-span-2"><Label>Story</Label><Textarea rows={4} value={s.story} onChange={(e) => update(i, "story", e.target.value)} /></div>
                                <div className="md:col-span-2"><Label>Order</Label><Input type="number" value={s.order ?? 0} onChange={(e) => update(i, "order", Number(e.target.value))} /></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
