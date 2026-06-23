"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function CreateJobPage() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
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

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const payload: any = { ...form };
            if (!payload.applyBy) delete payload.applyBy;
            const res = await jobsApi.create(payload);
            if (res.ok) {
                toast({ title: "Success", description: "Job posted" });
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

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
            <Link href="/admin/jobs" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4" /> Back to jobs
            </Link>
            <div>
                <h1 className="text-3xl font-bold">Post a new job</h1>
                <p className="text-slate-500 mt-1">Create a new career opportunity.</p>
            </div>

            <Card>
                <CardHeader><CardTitle>Job details</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Title *</Label>
                                <Input required value={form.title} onChange={(e) => set("title", e.target.value)} />
                            </div>
                            <div>
                                <Label>Department *</Label>
                                <Input required value={form.department} onChange={(e) => set("department", e.target.value)} />
                            </div>
                            <div>
                                <Label>Location *</Label>
                                <Input required value={form.location} onChange={(e) => set("location", e.target.value)} />
                            </div>
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
                            <div className="md:col-span-2">
                                <Label>Description *</Label>
                                <Textarea required rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Requirements</Label>
                                <Textarea rows={5} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} />
                            </div>
                            <div>
                                <Label>Apply By</Label>
                                <Input type="date" value={form.applyBy} onChange={(e) => set("applyBy", e.target.value)} />
                            </div>
                            <div className="flex items-end gap-2">
                                <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
                                <Label>Active</Label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => router.push("/admin/jobs")}>Cancel</Button>
                            <Button type="submit" disabled={busy} className="bg-amber-500 text-black hover:bg-amber-400">
                                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create job
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}