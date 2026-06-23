"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { getRegistrationSection, updateRegistrationSection } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";

type Zone = { name: string; deadline: string; cities: string[] };

export default function ZoneDeadlinePage() {
    const [items, setItems] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getRegistrationSection("zone-deadline");
                if (res.ok && Array.isArray(res.data?.data)) {
                    setItems(
                        res.data.data.map((z: any) => ({
                            ...z,
                            deadline: z.deadline ? new Date(z.deadline).toISOString().slice(0, 10) : "",
                            cities: Array.isArray(z.cities) ? z.cities : [],
                        }))
                    );
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
            const payload = items.map((z) => ({ ...z, deadline: z.deadline ? new Date(z.deadline).toISOString() : new Date().toISOString() }));
            const res = await updateRegistrationSection("zone-deadline", payload);
            if (res.ok) toast({ title: "Success", description: "Saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    const add = () => setItems([...items, { name: "", deadline: "", cities: [] }]);
    const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const update = (i: number, k: keyof Zone, v: any) =>
        setItems(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Zone Deadlines</h1>
                    <p className="text-slate-500 mt-1">Trial deadlines for each zone.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={add} variant="outline"><Plus className="w-4 h-4 mr-2" /> Add zone</Button>
                    <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                    </Button>
                </div>
            </div>

            {items.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-slate-500">No zones yet.</CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {items.map((z, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base">Zone #{i + 1}</CardTitle>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(i)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div><Label>Zone Name</Label><Input value={z.name} onChange={(e) => update(i, "name", e.target.value)} /></div>
                                <div><Label>Deadline</Label><Input type="date" value={z.deadline} onChange={(e) => update(i, "deadline", e.target.value)} /></div>
                                <div className="md:col-span-3">
                                    <Label>Cities (comma-separated)</Label>
                                    <Input
                                        value={z.cities.join(", ")}
                                        onChange={(e) => update(i, "cities", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                                        placeholder="Mumbai, Pune, Nagpur"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
