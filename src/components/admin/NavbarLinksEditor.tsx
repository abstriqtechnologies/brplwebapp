"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { updateSettings } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";

type NavbarChild = { label: string; path: string };
type NavbarLink = { label: string; path: string; children?: NavbarChild[] };

function blankLink(): NavbarLink {
    return { label: "", path: "", children: [] };
}

function blankChild(): NavbarChild {
    return { label: "", path: "" };
}

export function NavbarLinksEditor({ initial }: { initial: NavbarLink[] }) {
    const [links, setLinks] = useState<NavbarLink[]>(
        Array.isArray(initial) && initial.length > 0 ? initial : [blankLink()]
    );
    const [saving, setSaving] = useState(false);
    const [openIdx, setOpenIdx] = useState<number | null>(null);

    const add = () => setLinks([...links, blankLink()]);
    const remove = (i: number) => setLinks(links.filter((_, idx) => idx !== i));
    const update = (i: number, k: keyof NavbarLink, v: any) =>
        setLinks(links.map((b, idx) => (idx === i ? { ...b, [k]: v } : b)));

    const addChild = (i: number) => {
        const next = [...links];
        next[i] = { ...next[i], children: [...(next[i].children || []), blankChild()] };
        setLinks(next);
    };
    const removeChild = (i: number, ci: number) => {
        const next = [...links];
        const kids = [...(next[i].children || [])];
        kids.splice(ci, 1);
        next[i] = { ...next[i], children: kids };
        setLinks(next);
    };
    const updateChild = (i: number, ci: number, k: keyof NavbarChild, v: string) => {
        const next = [...links];
        const kids = [...(next[i].children || [])];
        kids[ci] = { ...kids[ci], [k]: v };
        next[i] = { ...next[i], children: kids };
        setLinks(next);
    };

    const save = async () => {
        setSaving(true);
        try {
            // strip empty entries
            const cleaned = links
                .filter((l) => l.label.trim() || l.path.trim())
                .map((l) => ({
                    label: l.label,
                    path: l.path,
                    children: (l.children || []).filter((c) => c.label.trim() || c.path.trim()),
                }));
            const res = await updateSettings({ navbarLinks: cleaned });
            if (res.ok) toast({ title: "Success", description: "Navbar links saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to save" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg">Navbar Links</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                        Top-level navigation links. Each link may have nested children.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={add} size="sm" variant="outline">
                        <Plus className="w-3 h-3 mr-1" /> Add link
                    </Button>
                    <Button onClick={save} disabled={saving} size="sm" className="bg-amber-500 text-black hover:bg-amber-400">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save links
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {links.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No links. Click "Add link".</p>
                ) : (
                    links.map((l, i) => {
                        const isOpen = openIdx === i;
                        const childCount = (l.children || []).length;
                        return (
                            <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"
                                        onClick={() => setOpenIdx(isOpen ? null : i)}
                                    >
                                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        Link #{i + 1} {l.label && `— ${l.label}`}
                                        {childCount > 0 && (
                                            <span className="text-xs text-slate-500">({childCount} children)</span>
                                        )}
                                    </button>
                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(i)}>
                                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                                    </Button>
                                </div>
                                {isOpen && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <Label className="mb-1 block">Label</Label>
                                                <Input
                                                    value={l.label || ""}
                                                    onChange={(e) => update(i, "label", e.target.value)}
                                                    placeholder="Home"
                                                />
                                            </div>
                                            <div>
                                                <Label className="mb-1 block">Path</Label>
                                                <Input
                                                    value={l.path || ""}
                                                    onChange={(e) => update(i, "path", e.target.value)}
                                                    placeholder="/home"
                                                />
                                            </div>
                                        </div>
                                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold uppercase text-slate-500">
                                                    Child links
                                                </span>
                                                <Button size="sm" variant="outline" onClick={() => addChild(i)}>
                                                    <Plus className="w-3 h-3 mr-1" /> Add child
                                                </Button>
                                            </div>
                                            {(l.children || []).length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">No children</p>
                                            ) : (
                                                (l.children || []).map((c, ci) => (
                                                    <div key={ci} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                                                        <div>
                                                            <Label className="mb-1 block text-xs">Child label</Label>
                                                            <Input
                                                                value={c.label || ""}
                                                                onChange={(e) => updateChild(i, ci, "label", e.target.value)}
                                                                placeholder="Sub link"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="mb-1 block text-xs">Child path</Label>
                                                            <Input
                                                                value={c.path || ""}
                                                                onChange={(e) => updateChild(i, ci, "path", e.target.value)}
                                                                placeholder="/path"
                                                            />
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-600"
                                                            onClick={() => removeChild(i, ci)}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
