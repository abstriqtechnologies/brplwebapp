"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jobsApi } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";

export default function EditJobPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        title: "",
        department: "",
        location: "",
        type: "full-time",
        description: "",
        requirements: "",
        applyBy: "",
        active: true,
    });

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const res = await jobsApi.get(id);
                if (res.ok && res.data) {
                    const j = res.data;
                    setForm({
                        title: j.title || "",
                        department: j.department || "",
                        location: j.location || "",
                        type: j.type || "full-time",
                        description: j.description || "",
                        requirements: j.requirements || "",
                        applyBy: j.applyBy ? new Date(j.applyBy).toISOString().slice(0, 10) : "",
                        active: Boolean(j.active),
                    });
                }
            } catch {
                toast({ variant: "destructive", title: "Error", description: "Failed to load job" });
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const payload: any = { ...form };
            if (!payload.applyBy) delete payload.applyBy;
            const res = await jobsApi.update(id, payload);
            if (res.ok) {
                toast({ title: "Success", description: "Job updated" });
                router.replace("/admin/jobs");
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed" });
        } finally {
            setBusy(false);
        }
    };

    const set = (k: string, v: any) => setForm({ ...form, [k]: v });

    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
            <Link href="/admin/jobs" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4" /> Back to jobs
            </Link>
            <div>
                <h1 className="text-3xl font-bold">Edit job</h1>
            </div>

            <Card>
                <CardHeader><CardTitle>Job details</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>Title *</Label><Input required value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
                            <div><Label>Department *</Label><Input required value={form.department} onChange={(e) => set("department", e.target.value)} /></div>
                            <div><Label>Location *</Label><Input required value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
                            <div>
                                <Label>Type *</Label>
                                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full-time">Full-time</SelectItem>
                                        <SelectItem value="part-time">Part-time</SelectItem>
                                        <SelectItem value="contract">Contract</SelectItem>
                                        <SelectItem value="internship">Internship</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-2"><Label>Description *</Label><Textarea required rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
                            <div className="md:col-span-2"><Label>Requirements</Label><Textarea rows={5} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} /></div>
                            <div><Label>Apply By</Label><Input type="date" value={form.applyBy} onChange={(e) => set("applyBy", e.target.value)} /></div>
                            <div className="flex items-end gap-2"><Switch checked={form.active} onCheckedChange={(v) => set("active", v)} /><Label>Active</Label></div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => router.push("/admin/jobs")}>Cancel</Button>
                            <Button type="submit" disabled={busy} className="bg-amber-500 text-black hover:bg-amber-400">
                                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save changes
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}