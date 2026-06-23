"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export type CmsField = {
    name: string;
    label: string;
    type: "text" | "email" | "url" | "tel" | "number" | "textarea" | "boolean";
    required?: boolean;
    placeholder?: string;
    rows?: number;
};

/**
 * Generic CMS page: GET → load current document → user edits → PATCH.
 *
 * `getData` should return the document (object).
 * `saveData` should PATCH the same endpoint with the new values.
 */
export function CmsForm({
    title,
    description,
    getData,
    saveData,
    fields,
    children,
}: {
    title: string;
    description?: string;
    getData: () => Promise<{ ok: boolean; data?: any; error?: string }>;
    saveData: (body: any) => Promise<{ ok: boolean; error?: string }>;
    fields: CmsField[];
    children?: (data: any) => ReactNode;
}) {
    const [data, setData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getData();
                if (res.ok && res.data) {
                    setData(res.data);
                }
            } catch {
                toast({ variant: "destructive", title: "Error", description: "Failed to load" });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const set = (k: string, v: any) => setData({ ...data, [k]: v });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await saveData(data);
            if (res.ok) {
                toast({ title: "Success", description: "Saved" });
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold">{title}</h1>
                {description && <p className="text-slate-500 mt-1">{description}</p>}
            </div>
            <form onSubmit={submit} className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fields.map((f) => (
                                <div key={f.name} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                                    <Label className="mb-2 block">
                                        {f.label}
                                        {f.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    {f.type === "textarea" ? (
                                        <Textarea
                                            value={data[f.name] ?? ""}
                                            onChange={(e) => set(f.name, e.target.value)}
                                            rows={f.rows || 4}
                                            placeholder={f.placeholder}
                                            required={f.required}
                                        />
                                    ) : f.type === "boolean" ? (
                                        <Switch checked={Boolean(data[f.name])} onCheckedChange={(v) => set(f.name, v)} />
                                    ) : (
                                        <Input
                                            type={f.type}
                                            value={data[f.name] ?? ""}
                                            onChange={(e) => set(f.name, e.target.value)}
                                            placeholder={f.placeholder}
                                            required={f.required}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        {children && children(data)}
                    </CardContent>
                </Card>
                <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save changes
                    </Button>
                </div>
            </form>
        </div>
    );
}