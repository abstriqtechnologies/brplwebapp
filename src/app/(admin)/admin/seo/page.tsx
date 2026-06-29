"use client";

import { Search, Globe, Save, FileText } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { ScriptEditor } from "@/components/admin/seo/ScriptEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/apihelper/api";

const STATIC_PAGES = [
    { label: "Home", path: "/" },
    { label: "About Us", path: "/about-us" },
    { label: "Teams", path: "/teams" },
    { label: "Events", path: "/events" },
    { label: "Blog", path: "/blog" },
    { label: "News", path: "/news" },
    { label: "Partners", path: "/partners" },
    { label: "Types of Partners", path: "/types-of-partners" },
    { label: "Career", path: "/career" },
    { label: "FAQs", path: "/faqs" },
    { label: "Contact Us", path: "/contact-us" },
    { label: "Privacy Policy", path: "/privacy-policy" },
    { label: "Terms & Conditions", path: "/terms-and-conditions" },
    { label: "Rule Book", path: "/rule-book" },
    { label: "Thank You", path: "/thank-you" },
    { label: "Dashboard", path: "/dashboard" },
];

type PageMeta = {
    path: string;
    title: string;
    description: string;
    keywords: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    customHeadScripts: string;
};

const EMPTY_META: PageMeta = {
    path: "",
    title: "",
    description: "",
    keywords: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    customHeadScripts: "",
};

export default function AdminSeoPage() {
    // Global scripts state
    const [headScripts, setHeadScripts] = useState("");
    const [bodyScripts, setBodyScripts] = useState("");
    const [globalLoading, setGlobalLoading] = useState(true);
    const [globalSaving, setGlobalSaving] = useState(false);
    const [globalStatus, setGlobalStatus] = useState<"idle" | "saved" | "error">("idle");

    // Per-page SEO state
    const [pageMetaMap, setPageMetaMap] = useState<Record<string, PageMeta>>({});
    const [selectedPath, setSelectedPath] = useState("");
    const [form, setForm] = useState<PageMeta>(EMPTY_META);
    const [pageLoading, setPageLoading] = useState(true);
    const [pageSaving, setPageSaving] = useState(false);
    const [pageStatus, setPageStatus] = useState<"idle" | "saved" | "error">("idle");

    const selectedPageLabel = STATIC_PAGES.find((p) => p.path === selectedPath)?.label ?? selectedPath;

    // ── Fetch global scripts ──
    const fetchGlobal = useCallback(async () => {
        setGlobalLoading(true);
        const res = await api.get<{ customHeadScripts: string; customBodyScripts: string }>(
            "/api/admin/settings/seo",
        );
        if (res.ok && res.data) {
            setHeadScripts(res.data.customHeadScripts ?? "");
            setBodyScripts(res.data.customBodyScripts ?? "");
        }
        setGlobalLoading(false);
    }, []);

    // ── Fetch per-page SEO ──
    const fetchPages = useCallback(async () => {
        setPageLoading(true);
        const res = await api.get<{ pages: PageMeta[] }>("/api/admin/settings/seo/pages");
        if (res.ok && res.data?.pages) {
            const map: Record<string, PageMeta> = {};
            for (const p of res.data.pages) {
                map[p.path] = p;
            }
            setPageMetaMap(map);
        }
        setPageLoading(false);
    }, []);

    useEffect(() => {
        void fetchGlobal();
        void fetchPages();
    }, [fetchGlobal, fetchPages]);

    // ── When selectedPath changes, populate form ──
    useEffect(() => {
        if (selectedPath && pageMetaMap[selectedPath]) {
            setForm({ ...pageMetaMap[selectedPath] });
        } else {
            setForm({ ...EMPTY_META, path: selectedPath });
        }
    }, [selectedPath, pageMetaMap]);

    // ── Save global scripts ──
    const handleSaveGlobal = useCallback(async () => {
        if (globalSaving) return;
        setGlobalSaving(true);
        setGlobalStatus("idle");
        const res = await api.patch("/api/admin/settings/seo", {
            customHeadScripts: headScripts,
            customBodyScripts: bodyScripts,
        });
        setGlobalSaving(false);
        setGlobalStatus(res.ok ? "saved" : "error");
        setTimeout(() => setGlobalStatus("idle"), 3000);
    }, [headScripts, bodyScripts, globalSaving]);

    // ── Save per-page SEO ──
    const handleSavePage = useCallback(async () => {
        if (pageSaving || !selectedPath) return;
        setPageSaving(true);
        setPageStatus("idle");
        const res = await api.patch("/api/admin/settings/seo/pages", {
            path: selectedPath,
            title: form.title,
            description: form.description,
            keywords: form.keywords,
            ogTitle: form.ogTitle,
            ogDescription: form.ogDescription,
            ogImage: form.ogImage,
            customHeadScripts: form.customHeadScripts,
        });
        setPageSaving(false);
        if (res.ok) {
            setPageStatus("saved");
            // Update local map
            setPageMetaMap((prev) => ({
                ...prev,
                [selectedPath]: { ...form, path: selectedPath },
            }));
        } else {
            setPageStatus("error");
        }
        setTimeout(() => setPageStatus("idle"), 3000);
    }, [selectedPath, form, pageSaving]);

    const set = <K extends keyof PageMeta>(key: K, value: PageMeta[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    return (
        <main className="p-6 min-w-0 w-full">
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <Search className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            SEO
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Search Engine Optimization tools
                        </p>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════ */}
            {/* GLOBAL SCRIPTS CARD */}
            {/* ════════════════════════════════════════ */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden mb-6">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                    <Globe className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Global</h2>
                </div>

                <div className="p-5 space-y-6">
                    {globalLoading ? (
                        <div className="space-y-4">
                            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Global Head Script/Meta code
                                    </label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        Injected into the &lt;head&gt; of every public page. Use this for Google
                                        Analytics, Search Console verification, Meta Pixel, etc.
                                    </p>
                                    <ScriptEditor
                                        value={headScripts}
                                        onChange={setHeadScripts}
                                        placeholder="<!-- Add your head scripts here -->"
                                        minHeight="360px"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Global Body Scripts (e.g. GTM noscript)
                                    </label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        Injected into the &lt;body&gt; on every public page. Use this for snippets
                                        that must live in the body, like the Google Tag Manager noscript iframe.
                                    </p>
                                    <ScriptEditor
                                        value={bodyScripts}
                                        onChange={setBodyScripts}
                                        placeholder="<!-- Add your body scripts here -->"
                                        minHeight="360px"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handleSaveGlobal}
                                    disabled={globalSaving}
                                    className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {globalSaving ? "Saving..." : "Save Global"}
                                </Button>
                                {globalStatus === "saved" && (
                                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">Saved successfully</span>
                                )}
                                {globalStatus === "error" && (
                                    <span className="text-sm text-red-600 dark:text-red-400 font-medium">Failed to save.</span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ════════════════════════════════════════ */}
            {/* PER-PAGE SEO CARD */}
            {/* ════════════════════════════════════════ */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                    <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Edit SEO Configuration
                    </h2>
                </div>

                <div className="p-5">
                    {pageLoading ? (
                        <div className="space-y-4">
                            <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-24 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Page Selector */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Select Page
                                </label>
                                <select
                                    value={selectedPath}
                                    onChange={(e) => setSelectedPath(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="">-- Choose a page --</option>
                                    {STATIC_PAGES.map((p) => (
                                        <option key={p.path} value={p.path}>
                                            {p.label} ({p.path})
                                        </option>
                                    ))}
                                    {/* Custom pages from DB not in the static list */}
                                    {Object.keys(pageMetaMap)
                                        .filter((path) => !STATIC_PAGES.some((sp) => sp.path === path))
                                        .map((path) => (
                                            <option key={path} value={path}>
                                                {path}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {selectedPath && (
                                <>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Changes affect how <strong>{selectedPageLabel}</strong> appears in Google
                                        searches and social media previews.
                                    </p>

                                    {/* Meta Title */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Page Meta Title
                                        </label>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                            Appears as the blue clickable link in Google searches. Keep it under 60
                                            characters for best results.
                                        </p>
                                        <Input
                                            value={form.title}
                                            onChange={(e) => set("title", e.target.value)}
                                            placeholder="Enter page title"
                                            maxLength={120}
                                        />
                                        <span className="text-xs text-slate-400 mt-1 block text-right">
                                            {form.title.length}/60
                                        </span>
                                    </div>

                                    {/* Meta Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Meta Description
                                        </label>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                            The small paragraph text under the search result link. Recommended length is
                                            150-160 characters.
                                        </p>
                                        <Textarea
                                            value={form.description}
                                            onChange={(e) => set("description", e.target.value)}
                                            placeholder="Enter meta description"
                                            rows={3}
                                            maxLength={300}
                                        />
                                        <span className="text-xs text-slate-400 mt-1 block text-right">
                                            {form.description.length}/160
                                        </span>
                                    </div>

                                    {/* Focus Keywords */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Focus Keywords{" "}
                                            <span className="text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                            Comma separated keywords relevant to the page content.
                                        </p>
                                        <Input
                                            value={form.keywords}
                                            onChange={(e) => set("keywords", e.target.value)}
                                            placeholder="keyword1, keyword2, keyword3"
                                        />
                                    </div>

                                    {/* Open Graph */}
                                    <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
                                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                            Open Graph <span className="text-slate-400 font-normal">(Social sharing)</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                            Override how this page appears when shared on Facebook, LinkedIn, etc.
                                            Leave blank to use the meta title and description above.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    OG Title <span className="text-slate-400">(optional)</span>
                                                </label>
                                                <Input
                                                    value={form.ogTitle}
                                                    onChange={(e) => set("ogTitle", e.target.value)}
                                                    placeholder="Open Graph title"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    OG Description <span className="text-slate-400">(optional)</span>
                                                </label>
                                                <Input
                                                    value={form.ogDescription}
                                                    onChange={(e) => set("ogDescription", e.target.value)}
                                                    placeholder="Open Graph description"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                OG Image URL <span className="text-slate-400">(optional)</span>
                                            </label>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                                Image shown when the page is shared. Use absolute URL. Recommended
                                                1200&times;630 px.
                                            </p>
                                            <Input
                                                value={form.ogImage}
                                                onChange={(e) => set("ogImage", e.target.value)}
                                                placeholder="https://example.com/og-image.jpg"
                                            />
                                        </div>
                                    </div>

                                    {/* Per-page Scripts */}
                                    <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
                                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                            Per-page Script &amp; Schema Tags
                                        </h3>

                                        <div className="mt-3">
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                Custom Page Scripts &amp; Schema (&lt;head&gt;)
                                            </label>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                                Paste JSON-LD schema or script tags specifically for this page. They
                                                will be injected into the &lt;head&gt;.
                                            </p>
                                            <ScriptEditor
                                                value={form.customHeadScripts}
                                                onChange={(val) => set("customHeadScripts", val)}
                                                placeholder='<script type="application/ld+json">{"@context":"...}</script>'
                                                minHeight="140px"
                                            />
                                        </div>
                                    </div>

                                    {/* Save Button */}
                                    <div className="flex items-center gap-3 pt-2">
                                        <Button
                                            onClick={handleSavePage}
                                            disabled={pageSaving || !selectedPath}
                                            className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                                        >
                                            <Save className="h-4 w-4" />
                                            {pageSaving ? "Saving..." : "Save SEO Settings"}
                                        </Button>
                                        {pageStatus === "saved" && (
                                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                                Saved successfully
                                            </span>
                                        )}
                                        {pageStatus === "error" && (
                                            <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                                                Failed to save.
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
