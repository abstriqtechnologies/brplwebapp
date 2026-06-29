"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import api from "@/apihelper/api";
import { cn } from "@/lib/utils";

interface LegalEditorProps {
    type: "privacy" | "terms";
    title: string;
}

type LegalDoc = {
    title: string;
    content: string;
    version: string;
    effectiveDate: string;
};

const EMPTY_DOC: LegalDoc = {
    title: "",
    content: "",
    version: "1.0",
    effectiveDate: "",
};

export default function LegalEditor({ type, title }: LegalEditorProps) {
    const router = useRouter();

    const [form, setForm] = useState<LegalDoc>(EMPTY_DOC);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(null);

        api.get<{ ok: boolean; data?: { legalPage: LegalDoc & { _id: string } }; error?: string }>(
            `/api/admin/legal/${type}`,
        )
            .then((res) => {
                if (res.ok && res.data?.data?.legalPage) {
                    const d = res.data.data.legalPage;
                    setForm({
                        title: d.title ?? "",
                        content: d.content ?? "",
                        version: d.version ?? "1.0",
                        effectiveDate: d.effectiveDate
                            ? new Date(d.effectiveDate).toISOString().split("T")[0]
                            : "",
                    });
                } else if (res.status === 404) {
                    // No doc yet — start with defaults
                    setForm({
                        title: title,
                        content: "",
                        version: "1.0",
                        effectiveDate: "",
                    });
                } else {
                    setError(res.error || "Failed to load document");
                }
            })
            .catch(() => setError("Failed to load document"))
            .finally(() => setLoading(false));
    }, [type, title]);

    const setField = <K extends keyof LegalDoc>(key: K, value: LegalDoc[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const validate = (): string | null => {
        if (!form.title.trim()) return "Title is required.";
        if (!form.version.trim()) return "Version is required.";
        return null;
    };

    const handleSave = useCallback(async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(false);

        const payload = {
            ...form,
            effectiveDate: form.effectiveDate || null,
        };

        const res = await api.patch(`/api/admin/legal/${type}`, payload);

        if (res.ok) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } else {
            const msg =
                (res.data as { message?: string })?.message ||
                res.error ||
                "Failed to save document";
            setError(msg);
        }

        setSubmitting(false);
    }, [form, type]);

    if (loading) {
        return (
            <main className="p-6 min-w-0">
                <div className="space-y-2 mb-6">
                    <div className="h-5 w-32 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden p-8 space-y-6">
                    {Array.from({ length: 3 }).map((_, i) => (
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
            {/* ── Sticky top bar ── */}
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/legal"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                            title="Back to legal"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Edit {title}
                            </h1>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Manage {title.toLowerCase()} content
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/admin/legal")}
                            disabled={submitting}
                            className="h-8 px-3 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleSave()}
                            disabled={submitting}
                            className="h-8 px-4 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {submitting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                            Save
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error / Success banner */}
            <div className="max-w-6xl mx-auto px-6 pt-4">
                {error && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center justify-between">
                        <span>{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-500 hover:text-red-700 ml-4 shrink-0"
                        >
                            &times;
                        </button>
                    </div>
                )}
                {success && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Saved successfully.
                    </div>
                )}
            </div>

            {/* ── Fields ── */}
            <div className="max-w-6xl mx-auto px-6 pt-6 pb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="legal-title"
                            className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                            Title <span className="text-red-400">*</span>
                        </Label>
                        <Input
                            id="legal-title"
                            value={form.title}
                            onChange={(e) => setField("title", e.target.value)}
                            placeholder="Document title"
                            required
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="legal-version"
                            className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                            Version <span className="text-red-400">*</span>
                        </Label>
                        <Input
                            id="legal-version"
                            value={form.version}
                            onChange={(e) => setField("version", e.target.value)}
                            placeholder="e.g. 1.0"
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="legal-effective-date"
                            className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                            Effective Date
                        </Label>
                        <Input
                            id="legal-effective-date"
                            type="date"
                            value={form.effectiveDate}
                            onChange={(e) => setField("effectiveDate", e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>
            </div>

            {/* ── Editor ── */}
            <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className="max-w-6xl mx-auto px-6 py-8">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 block">
                        Content
                    </Label>
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <BlogEditor
                            content={form.content}
                            onChange={(html) => setField("content", html)}
                            placeholder={`Write the ${title.toLowerCase()} content here...`}
                            minHeight="500px"
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
