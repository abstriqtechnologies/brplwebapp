"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import api from "@/apihelper/api";
import { cn } from "@/lib/utils";

type Params = { id: string };

type NewsFormValues = {
    title: string;
    slug: string;
    summary: string;
    content: string;
    featuredImage: string;
    tags: string;
    source: string;
    sourceUrl: string;
    metaTitle: string;
    metaDescription: string;
    enableSchema: boolean;
    draft: boolean;
};

function emptyForm(): NewsFormValues {
    return {
        title: "",
        slug: "",
        summary: "",
        content: "",
        featuredImage: "",
        tags: "",
        source: "",
        sourceUrl: "",
        metaTitle: "",
        metaDescription: "",
        enableSchema: true,
        draft: true,
    };
}

function slugify(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function NewsEditorPage({ params }: { params: Params }) {
    const router = useRouter();
    const id = params.id;

    const [form, setForm] = useState<NewsFormValues>(emptyForm);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [slugEdited, setSlugEdited] = useState(false);

    const isNew = id === "new";

    useEffect(() => {
        if (!id) return;
        if (id === "new") {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        api.get<{ ok: boolean; data?: { news: NewsFormValues & { _id: string } }; error?: string }>(
            `/api/admin/news/${id}`,
        )
            .then((res) => {
                if (res.ok && res.data?.data?.news) {
                    const d = res.data.data.news;
                    setForm({
                        title: d.title ?? "",
                        slug: d.slug ?? "",
                        summary: d.summary ?? "",
                        content: d.content ?? "",
                        featuredImage: d.featuredImage ?? "",
                        tags: Array.isArray(d.tags) ? d.tags.join(", ") : d.tags ?? "",
                        source: d.source ?? "",
                        sourceUrl: d.sourceUrl ?? "",
                        metaTitle: d.metaTitle ?? "",
                        metaDescription: d.metaDescription ?? "",
                        enableSchema: d.enableSchema ?? true,
                        draft: d.draft ?? true,
                    });
                    setSlugEdited(true);
                } else {
                    setError(res.error || "Failed to load news article");
                }
            })
            .catch(() => setError("Failed to load news article"))
            .finally(() => setLoading(false));
    }, [id]);

    const setField = <K extends keyof NewsFormValues>(key: K, value: NewsFormValues[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleTitleChange = (value: string) => {
        setField("title", value);
        if (!slugEdited) {
            setField("slug", slugify(value));
        }
    };

    const regenerateSlug = () => {
        setField("slug", slugify(form.title));
        setSlugEdited(true);
    };

    const handleSlugChange = (value: string) => {
        setField("slug", value);
        setSlugEdited(true);
    };

    const validate = (): string | null => {
        if (!form.title.trim()) return "Title is required.";
        if (!form.slug.trim()) return "Slug is required.";
        return null;
    };

    const handleSubmit = useCallback(
        async (publish: boolean) => {
            const validationError = validate();
            if (validationError) {
                setError(validationError);
                return;
            }

            setSubmitting(true);
            setError(null);

            const payload = {
                ...form,
                slug: form.slug.toLowerCase(),
                tags: form.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                draft: !publish,
            };

            const url = isNew ? "/api/admin/news" : `/api/admin/news/${id}`;
            const res = isNew ? await api.post(url, payload) : await api.patch(url, payload);

            if (res.ok) {
                router.push("/admin/news");
            } else {
                const msg =
                    (res.data as { message?: string } | null)?.message ||
                    res.error ||
                    "Failed to save news article";
                setError(msg);
            }

            setSubmitting(false);
        },
        [form, id, router],
    );

    if (!id) {
        return (
            <main className="p-6 flex items-center justify-center min-h-screen">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </main>
        );
    }

    if (loading) {
        return (
            <main className="p-6 min-w-0">
                <div className="space-y-2 mb-6">
                    <div className="h-5 w-32 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden p-8 space-y-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <div className="h-4 w-28 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        </div>
                    ))}
                </div>
            </main>
        );
    }

    const inputClass =
        "h-9 text-sm rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-shadow";

    return (
        <main className="min-h-screen bg-white dark:bg-slate-950">
            {/* Sticky top bar */}
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/news"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                            title="Back to news"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {isNew ? "New News Article" : "Edit News Article"}
                            </h1>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {isNew ? "Draft a new article" : `Editing: ${form.title || "untitled"}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/admin/news")}
                            disabled={submitting}
                            className="h-8 px-3 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleSubmit(false)}
                            disabled={submitting}
                            className="h-8 px-3 text-xs"
                        >
                            {submitting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                            Save Draft
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleSubmit(true)}
                            disabled={submitting}
                            className="h-8 px-4 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {submitting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                            Publish
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="max-w-6xl mx-auto px-6 pt-4">
                    <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 shrink-0">
                            &times;
                        </button>
                    </div>
                </div>
            )}

            {/* Metadata fields */}
            <div className="max-w-6xl mx-auto px-6 pt-8 pb-6 space-y-8">
                {/* Row 1: Title + Slug */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Title <span className="text-red-400">*</span>
                        </Label>
                        <Input
                            id="title"
                            value={form.title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            placeholder="Article title"
                            required
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Slug <span className="text-red-400">*</span>
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="slug"
                                value={form.slug}
                                onChange={(e) => handleSlugChange(e.target.value)}
                                placeholder="url-friendly-slug"
                                className={cn(inputClass, "flex-1 font-mono text-xs")}
                                required
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={regenerateSlug}
                                className="h-9 shrink-0 text-xs px-3"
                            >
                                Generate
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Row 2: Source + Source URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="source" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Source
                        </Label>
                        <Input
                            id="source"
                            value={form.source}
                            onChange={(e) => setField("source", e.target.value)}
                            placeholder="e.g. ESPN, Reuters"
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="sourceUrl" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Source URL
                        </Label>
                        <Input
                            id="sourceUrl"
                            value={form.sourceUrl}
                            onChange={(e) => setField("sourceUrl", e.target.value)}
                            placeholder="https://example.com/original-article"
                            className={inputClass}
                        />
                    </div>
                </div>

                {/* Row 3: Summary (full width) */}
                <div className="space-y-1.5">
                    <Label htmlFor="summary" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Summary
                    </Label>
                    <Textarea
                        id="summary"
                        value={form.summary}
                        onChange={(e) => setField("summary", e.target.value)}
                        placeholder="Brief summary of the article"
                        rows={2}
                        className="text-sm rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                    />
                </div>

                {/* Row 4: Tags + (empty placeholder for alignment) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="tags" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Tags
                        </Label>
                        <Input
                            id="tags"
                            value={form.tags}
                            onChange={(e) => setField("tags", e.target.value)}
                            placeholder="transfer, match, rumor"
                            className={inputClass}
                        />
                    </div>
                    <div />
                </div>

                {/* Row 5: Meta Title + Meta Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="metaTitle" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Meta Title (SEO)
                        </Label>
                        <Input
                            id="metaTitle"
                            value={form.metaTitle}
                            onChange={(e) => setField("metaTitle", e.target.value)}
                            placeholder="SEO title for search engines"
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="metaDescription" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Meta Description (SEO)
                        </Label>
                        <Textarea
                            id="metaDescription"
                            value={form.metaDescription}
                            onChange={(e) => setField("metaDescription", e.target.value)}
                            placeholder="Short description for search results"
                            rows={2}
                            className="text-sm rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                        />
                    </div>
                </div>

                {/* Row 6: Featured Image + Switches */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Featured Image
                        </Label>
                        <ImageUpload
                            value={form.featuredImage}
                            onChange={(url) => setField("featuredImage", url)}
                        />
                    </div>
                    <div className="space-y-4 pt-5">
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                            <div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Published
                                </span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Visible on /news</p>
                            </div>
                            <Switch checked={!form.draft} onCheckedChange={(v) => setField("draft", !v)} />
                        </label>
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                            <div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Article Schema
                                </span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">JSON-LD for SEO</p>
                            </div>
                            <Switch checked={form.enableSchema} onCheckedChange={(v) => setField("enableSchema", v)} />
                        </label>
                    </div>
                </div>
            </div>

            {/* Editor */}
            <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className="max-w-6xl mx-auto px-6 py-8">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 block">
                        Content
                    </Label>
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <BlogEditor
                            content={form.content}
                            onChange={(html) => setField("content", html)}
                            placeholder="Start writing..."
                            minHeight="500px"
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
