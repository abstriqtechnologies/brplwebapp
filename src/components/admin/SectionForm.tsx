"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { MediaUploadField } from "./MediaUploadField";

export type SectionField = {
    name: string;
    label: string;
    type?: "text" | "url" | "email" | "tel" | "textarea";
    placeholder?: string;
    rows?: number;
    /** Render an image picker field instead of a bare URL input. */
    image?: boolean;
    /** When image is true, control upload kind. */
    imageKind?: "image" | "video";
};

export type SectionArrayItem = {
    id: string;
    fields: Record<string, string>;
};

export function SectionForm({
    title,
    description,
    loadData,
    saveData,
    fields,
    arrayFields,
}: {
    title: string;
    description?: string;
    loadData: () => Promise<{ ok: boolean; data?: { data?: any }; error?: string }>;
    saveData: (body: any) => Promise<{ ok: boolean; error?: string }>;
    fields?: SectionField[];
    arrayFields?: {
        name: string;
        itemLabel: string;
        itemFields: SectionField[];
    };
}) {
    const [scalar, setScalar] = useState<Record<string, string>>({});
    const [items, setItems] = useState<SectionArrayItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await loadData();
                if (res.ok && res.data?.data) {
                    const d = res.data.data;
                    const s: Record<string, string> = {};
                    for (const f of fields || []) s[f.name] = d?.[f.name] || "";
                    setScalar(s);
                    if (arrayFields) {
                        const arr = Array.isArray(d?.[arrayFields.name]) ? d[arrayFields.name] : [];
                        setItems(arr.map((it: any, idx: number) => ({
                            id: `${Date.now()}-${idx}`,
                            fields: normalizeItemFields(arrayFields.itemFields, it),
                        })));
                    }
                }
            } catch {
                toast({ variant: "destructive", title: "Error", description: "Failed to load" });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body: any = { ...scalar };
            if (arrayFields) {
                body[arrayFields.name] = items.map((it) => it.fields);
            }
            const res = await saveData(body);
            if (res.ok) toast({ title: "Success", description: "Saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    const addItem = () => {
        const empty: Record<string, string> = {};
        for (const f of arrayFields?.itemFields || []) empty[f.name] = "";
        setItems([...items, { id: `${Date.now()}-${Math.random()}`, fields: empty }]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter((it) => it.id !== id));
    };

    const updateItem = (id: string, name: string, value: string) => {
        setItems(items.map((it) => it.id === id ? { ...it, fields: { ...it.fields, [name]: value } } : it));
    };

    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold">{title}</h1>
                {description && <p className="text-slate-500 mt-1">{description}</p>}
            </div>
            <form onSubmit={submit} className="space-y-4">
                {fields && fields.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {fields.map((f) => (
                                    <div key={f.name} className={f.type === "textarea" || f.image ? "md:col-span-2" : ""}>
                                        {f.image ? (
                                            <MediaUploadField
                                                label={f.label}
                                                value={scalar[f.name] || ""}
                                                onChange={(v) => setScalar({ ...scalar, [f.name]: v })}
                                                kind={f.imageKind || "image"}
                                            />
                                        ) : (
                                            <>
                                                <Label className="mb-2 block">{f.label}</Label>
                                                {f.type === "textarea" ? (
                                                    <Textarea
                                                        value={scalar[f.name] || ""}
                                                        onChange={(e) => setScalar({ ...scalar, [f.name]: e.target.value })}
                                                        rows={f.rows || 4}
                                                        placeholder={f.placeholder}
                                                    />
                                                ) : (
                                                    <Input
                                                        type={f.type || "text"}
                                                        value={scalar[f.name] || ""}
                                                        onChange={(e) => setScalar({ ...scalar, [f.name]: e.target.value })}
                                                        placeholder={f.placeholder}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {arrayFields && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{arrayFields.itemLabel}</CardTitle>
                            <Button type="button" size="sm" variant="outline" onClick={addItem}>
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {items.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No items yet.</p>
                            ) : (
                                items.map((it, idx) => (
                                    <div key={it.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-slate-500">#{idx + 1}</span>
                                            <Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => removeItem(it.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {arrayFields.itemFields.map((f) => (
                                                <div key={f.name} className={f.type === "textarea" || f.image ? "md:col-span-2" : ""}>
                                                    {f.image ? (
                                                        <MediaUploadField
                                                            label={f.label}
                                                            value={it.fields[f.name] || ""}
                                                            onChange={(v) => updateItem(it.id, f.name, v)}
                                                            kind={f.imageKind || "image"}
                                                        />
                                                    ) : (
                                                        <>
                                                            <Label className="mb-1 block text-xs">{f.label}</Label>
                                                            {f.type === "textarea" ? (
                                                                <Textarea
                                                                    rows={f.rows || 3}
                                                                    value={it.fields[f.name] || ""}
                                                                    onChange={(e) => updateItem(it.id, f.name, e.target.value)}
                                                                    placeholder={f.placeholder}
                                                                />
                                                            ) : (
                                                                <Input
                                                                    type={f.type || "text"}
                                                                    value={it.fields[f.name] || ""}
                                                                    onChange={(e) => updateItem(it.id, f.name, e.target.value)}
                                                                    placeholder={f.placeholder}
                                                                />
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                )}

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

function normalizeItemFields(fields: SectionField[], source: any): Record<string, string> {
    const out: Record<string, string> = {};
    for (const f of fields) {
        const v = source?.[f.name];
        out[f.name] = v === undefined || v === null ? "" : String(v);
    }
    return out;
}
