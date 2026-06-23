"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { formatDate } from "@/utils/adminDate";

export type CrudField =
    | { name: string; label: string; type: "text" | "email" | "url" | "number" | "textarea" | "date" | "datetime-local" | "select" | "boolean" | "tags"; required?: boolean; options?: { value: string; label: string }[]; placeholder?: string; rows?: number }
    | { name: string; label: string; type: "imageUrl"; required?: boolean; placeholder?: string };

type ResourceApi = {
    list: (page: number, limit: number, search: string) => Promise<{ ok: boolean; data?: { items: any[]; pagination: { pages: number; total: number } }; error?: string }>;
    create: (body: any) => Promise<{ ok: boolean; data?: any; error?: string }>;
    update: (id: string, body: any) => Promise<{ ok: boolean; data?: any; error?: string }>;
    remove: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

export function CrudPage({
    title,
    description,
    api,
    fields,
    searchFields = ["name", "title"],
    initialValues,
    columns,
}: {
    title: string;
    description?: string;
    api: ResourceApi;
    fields: CrudField[];
    searchFields?: string[];
    initialValues?: Record<string, any>;
    columns?: { header: string; cell: (row: any) => ReactNode; className?: string; }[];
}) {
    const [items, setItems] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.list(page, 50, search);
            if (res.ok && res.data) {
                setItems(res.data.items);
                setPages(res.data.pagination.pages);
                setTotal(res.data.pagination.total);
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to load" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [page]);

    const openCreate = () => {
        setEditing(null);
        setForm(buildInitialForm(fields, initialValues));
        setDialogOpen(true);
    };

    const openEdit = (row: any) => {
        setEditing(row);
        const f: Record<string, any> = { ...buildInitialForm(fields, initialValues) };
        for (const field of fields) {
            f[field.name] = row[field.name] ?? f[field.name];
            if (field.type === "date" || field.type === "datetime-local") {
                f[field.name] = row[field.name] ? toLocalDatetime(row[field.name]) : "";
            }
            if (field.type === "tags" && Array.isArray(row[field.name])) {
                f[field.name] = row[field.name].join(", ");
            }
        }
        setForm(f);
        setDialogOpen(true);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: Record<string, any> = { ...form };
            for (const field of fields) {
                if (field.type === "number") {
                    payload[field.name] = payload[field.name] === "" ? 0 : Number(payload[field.name]);
                }
                if (field.type === "boolean") {
                    payload[field.name] = Boolean(payload[field.name]);
                }
                if (field.type === "tags" && typeof payload[field.name] === "string") {
                    payload[field.name] = payload[field.name]
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean);
                }
                if ((field.type === "date" || field.type === "datetime-local") && payload[field.name]) {
                    payload[field.name] = new Date(payload[field.name]).toISOString();
                }
            }
            const res = editing
                ? await api.update(editing._id, payload)
                : await api.create(payload);
            if (res.ok) {
                toast({ title: "Success", description: `${editing ? "Updated" : "Created"} successfully` });
                setDialogOpen(false);
                load();
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    const remove = async (row: any) => {
        if (!confirm(`Delete this ${title.toLowerCase().slice(0, -1)}?`)) return;
        try {
            const res = await api.remove(row._id);
            if (res.ok) {
                toast({ title: "Success", description: "Deleted" });
                load();
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Delete failed" });
        }
    };

    const searchMatch = (row: any) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return searchFields.some((f) => String(row[f] || "").toLowerCase().includes(s));
    };

    const visibleItems = items.filter(searchMatch);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{title}</h1>
                    {description && <p className="text-slate-500 mt-1">{description}</p>}
                </div>
                <Button onClick={openCreate} className="bg-amber-500 text-black hover:bg-amber-400">
                    <Plus className="w-4 h-4 mr-2" />
                    Add new
                </Button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        </div>
                    ) : visibleItems.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No {title.toLowerCase()} found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {(columns || defaultColumns(fields)).map((c) => (
                                            <TableHead key={c.header} className={c.className}>{c.header}</TableHead>
                                        ))}
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleItems.map((row) => (
                                        <TableRow key={row._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            {(columns || defaultColumns(fields)).map((c, i) => (
                                                <TableCell key={i} className={c.className}>{c.cell(row)}</TableCell>
                                            ))}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openEdit(row)}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => remove(row)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between text-sm">
                <div className="text-slate-500">Showing {visibleItems.length} of {total}</div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <span className="text-slate-500">Page {page} of {pages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>Next</Button>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fields.map((field) => (
                                <div key={field.name} className={field.type === "textarea" || field.type === "imageUrl" ? "md:col-span-2" : ""}>
                                    <Label className="mb-2 block">
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    {renderFieldInput(field, form, setForm)}
                                </div>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {editing ? "Save changes" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function buildInitialForm(fields: CrudField[], initial?: Record<string, any>) {
    const out: Record<string, any> = { ...(initial || {}) };
    for (const f of fields) {
        if (out[f.name] === undefined) {
            if (f.type === "boolean") out[f.name] = true;
            else if (f.type === "number") out[f.name] = 0;
            else if (f.type === "tags") out[f.name] = "";
            else out[f.name] = "";
        }
    }
    return out;
}

function renderFieldInput(
    field: CrudField,
    form: Record<string, any>,
    setForm: (f: Record<string, any>) => void
) {
    const v = form[field.name];
    const set = (val: any) => setForm({ ...form, [field.name]: val });

    if (field.type === "textarea") {
        return <Textarea value={v || ""} onChange={(e) => set(e.target.value)} rows={field.rows || 4} placeholder={field.placeholder} required={field.required} />;
    }
    if (field.type === "select") {
        return (
            <Select value={v || ""} onValueChange={set}>
                <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                <SelectContent>
                    {(field.options || []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }
    if (field.type === "boolean") {
        return <Switch checked={Boolean(v)} onCheckedChange={set} />;
    }
    if (field.type === "imageUrl") {
        return (
            <div className="space-y-2">
                <Input value={v || ""} onChange={(e) => set(e.target.value)} placeholder={field.placeholder || "https://..."} />
                {v && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-md p-2 bg-slate-50 dark:bg-slate-800">
                        <img src={v} alt="preview" className="max-h-32 rounded" onError={(e) => (e.currentTarget.style.display = "none")} />
                    </div>
                )}
            </div>
        );
    }
    if (field.type === "tags") {
        return <Input value={v || ""} onChange={(e) => set(e.target.value)} placeholder="tag1, tag2, tag3" />;
    }
    return (
        <Input
            type={field.type}
            value={v ?? ""}
            onChange={(e) => set(field.type === "number" ? e.target.value : e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
        />
    );
}

function defaultColumns(fields: CrudField[]): { header: string; cell: (row: any) => ReactNode; className?: string }[] {
    const cols: { header: string; cell: (row: any) => ReactNode }[] = [];
    for (const f of fields.slice(0, 3)) {
        cols.push({
            header: f.label,
            cell: (row) => {
                const v = row[f.name];
                if (f.type === "boolean") {
                    return <Badge variant={v ? "default" : "secondary"}>{v ? "Active" : "Inactive"}</Badge>;
                }
                if (f.type === "imageUrl") {
                    return v ? <img src={v} alt="" className="h-10 w-10 object-cover rounded" /> : <span className="text-slate-400">—</span>;
                }
                if (v instanceof Date || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && f.type === "date")) {
                    return formatDate(v);
                }
                return <span className="truncate max-w-xs inline-block">{String(v ?? "—")}</span>;
            },
        });
    }
    return cols;
}

function toLocalDatetime(value: string | Date) {
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}