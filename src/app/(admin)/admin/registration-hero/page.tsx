"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import { getRegistrationSection, updateRegistrationSection } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";
import { MediaUploadField } from "@/components/admin/MediaUploadField";

type Hero = { title?: string; subtitle?: string; image?: string; videoUrl?: string; ctaText?: string; ctaLink?: string };

export default function RegistrationHeroPage() {
    const [data, setData] = useState<Hero>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getRegistrationSection("hero");
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
            const res = await updateRegistrationSection("hero", data);
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
                    <h1 className="text-3xl font-bold">Registration Hero</h1>
                    <p className="text-slate-500 mt-1">Hero banner at the top of the registration page.</p>
                </div>
                <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                </Button>
            </div>

            <Card>
                <CardHeader><CardTitle>Hero</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><Label>Title</Label><Input value={data.title || ""} onChange={(e) => setData({ ...data, title: e.target.value })} /></div>
                    <div className="md:col-span-2"><Label>Subtitle</Label><Textarea rows={3} value={data.subtitle || ""} onChange={(e) => setData({ ...data, subtitle: e.target.value })} /></div>
                    <div className="md:col-span-2"><MediaUploadField label="Image URL" value={data.image || ""} onChange={(v) => setData({ ...data, image: v })} kind="image" /></div>
                    <div className="md:col-span-2"><MediaUploadField label="Video URL" value={data.videoUrl || ""} onChange={(v) => setData({ ...data, videoUrl: v })} kind="video" /></div>
                    <div><Label>CTA Text</Label><Input value={data.ctaText || ""} onChange={(e) => setData({ ...data, ctaText: e.target.value })} /></div>
                    <div><Label>CTA Link</Label><Input value={data.ctaLink || ""} onChange={(e) => setData({ ...data, ctaLink: e.target.value })} /></div>
                </CardContent>
            </Card>
        </div>
    );
}
