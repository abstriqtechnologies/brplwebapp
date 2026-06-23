"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { updateSettings } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";

type FooterLink = { label: string; path: string };
type FooterGroup = { heading: string; links: FooterLink[] };

function blankGroup(): FooterGroup {
    return { heading: "", links: [blankLink()] };
}

function blankLink(): FooterLink {
    return { label: "", path: "" };
}

export function FooterLinksEditor({ initial }: { initial: FooterGroup[] }) {
    const [groups, setGroups] = useState<FooterGroup[]>(
        Array.isArray(initial) && initial.length > 0 ? initial : [blankGroup()]
    );
    const [saving, setSaving] = useState(false);
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    const addGroup = () => {
        const next = [...groups, blankGroup()];
        setGroups(next);
        setOpenIdx(next.length - 1);
    };
    const removeGroup = (i: number) => {
        const next = groups.filter((_, idx) => idx !== i);
        setGroups(next.length > 0 ? next : [blankGroup()]);
        setOpenIdx(null);
    };
    const updateGroup = (i: number, k: keyof FooterGroup, v: any) =>
        setGroups(groups.map((g, idx) => (idx === i ? { ...g, [k]: v } : g)));

    const addLink = (i: number) => {
        const next = [...groups];
        next[i] = { ...next[i], links: [...next[i].links, blankLink()] };
        setGroups(next);
    };
    const removeLink = (i: number, li: number) => {
        const next = [...groups];
        const links = [...next[i].links];
        links.splice(li, 1);
        next[i] = { ...next[i], links: links.length > 0 ? links : [blankLink()] };
        setGroups(next);
    };
    const updateLink = (i: number, li: number, k: keyof FooterLink, v: string) => {
        const next = [...groups];
        const links = [...next[i].links];
        links[li] = { ...links[li], [k]: v };
        next[i] = { ...next[i], links };
        setGroups(next);
    };

    const save = async () => {
        setSaving(true);
        try {
            const cleaned = groups
                .filter((g) => g.heading.trim())
                .map((g) => ({
                    heading: g.heading,
                    links: g.links.filter((l) => l.label.trim() || l.path.trim()),
                }));
            const res = await updateSettings({ footerLinks: cleaned });
            if (res.ok) toast({ title: "Success", description: "Footer links saved" });
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
                    <CardTitle className="text-lg">Footer Link Groups</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                        Each group has a heading and a list of links.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={addGroup} size="sm" variant="outline">
                        <Plus className="w-3 h-3 mr-1" /> Add group
                    </Button>
                    <Button onClick={save} disabled={saving} size="sm" className="bg-amber-500 text-black hover:bg-amber-400">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save groups
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {groups.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No groups. Click "Add group".</p>
                ) : (
                    groups.map((g, i) => {
                        const isOpen = openIdx === i;
                        return (
                            <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"
                                        onClick={() => setOpenIdx(isOpen ? null : i)}
                                    >
                                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        Group #{i + 1} {g.heading && `— ${g.heading}`}
                                    </button>
                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeGroup(i)}>
                                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                                    </Button>
                                </div>
                                {isOpen && (
                                    <>
                                        <div>
                                            <Label className="mb-1 block">Heading</Label>
                                            <Input
                                                value={g.heading || ""}
                                                onChange={(e) => updateGroup(i, "heading", e.target.value)}
                                                placeholder="Quick Links"
                                            />
                                        </div>
                                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold uppercase text-slate-500">
                                                    Links
                                                </span>
                                                <Button size="sm" variant="outline" onClick={() => addLink(i)}>
                                                    <Plus className="w-3 h-3 mr-1" /> Add link
                                                </Button>
                                            </div>
                                            {g.links.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">No links</p>
                                            ) : (
                                                g.links.map((l, li) => (
                                                    <div key={li} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                                                        <div>
                                                            <Label className="mb-1 block text-xs">Label</Label>
                                                            <Input
                                                                value={l.label || ""}
                                                                onChange={(e) => updateLink(i, li, "label", e.target.value)}
                                                                placeholder="About Us"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="mb-1 block text-xs">Path</Label>
                                                            <Input
                                                                value={l.path || ""}
                                                                onChange={(e) => updateLink(i, li, "path", e.target.value)}
                                                                placeholder="/about-us"
                                                            />
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-600"
                                                            onClick={() => removeLink(i, li)}
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
