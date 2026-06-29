"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BlogEditor } from "@/components/admin/BlogEditor";
import api from "@/apihelper/api";

type FaqFormValues = {
    question: string;
    answer: string;
    category: string;
    order: number;
    active: boolean;
};

function emptyForm(): FaqFormValues {
    return {
        question: "",
        answer: "",
        category: "general",
        order: 0,
        active: true,
    };
}

export default function NewFaqPage() {
    const router = useRouter();

    const [form, setForm] = useState<FaqFormValues>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setField = <K extends keyof FaqFormValues>(key: K, value: FaqFormValues[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const validate = (): string | null => {
        if (!form.question.trim()) return "Question is required.";
        if (!form.answer.trim()) return "Answer is required.";
        return null;
    };

    const handleSubmit = useCallback(async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        setError(null);

        const res = await api.post("/api/admin/legal/faqs", form);

        if (res.ok) {
            router.push("/admin/legal/faqs");
        } else {
            const msg =
                (res.data as { message?: string })?.message ||
                res.error ||
                "Failed to create FAQ";
            setError(msg);
        }

        setSubmitting(false);
    }, [form, router]);

    const inputClass =
        "h-9 text-sm rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-shadow";

    return (
        <main className="min-h-screen bg-white dark:bg-slate-950">
            {/* ── Sticky top bar ── */}
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/legal/faqs"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                            title="Back to FAQs"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                New FAQ
                            </h1>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Create a new frequently asked question
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/admin/legal/faqs")}
                            disabled={submitting}
                            className="h-8 px-3 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleSubmit()}
                            disabled={submitting}
                            className="h-8 px-4 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {submitting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                            Save
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="max-w-6xl mx-auto px-6 pt-4">
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 shrink-0">
                            &times;
                        </button>
                    </div>
                </div>
            )}

            {/* ── Fields ── */}
            <div className="max-w-6xl mx-auto px-6 pt-8 pb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="faq-question" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Question <span className="text-red-400">*</span>
                        </Label>
                        <Input
                            id="faq-question"
                            value={form.question}
                            onChange={(e) => setField("question", e.target.value)}
                            placeholder="Enter the question"
                            required
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="faq-category" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Category
                        </Label>
                        <Input
                            id="faq-category"
                            value={form.category}
                            onChange={(e) => setField("category", e.target.value)}
                            placeholder="e.g. general, billing, support"
                            className={inputClass}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="faq-order" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Order
                        </Label>
                        <Input
                            id="faq-order"
                            type="number"
                            value={form.order}
                            onChange={(e) => setField("order", parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5 pt-5">
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                            <div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Active
                                </span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Visible on the FAQs page
                                </p>
                            </div>
                            <Switch checked={form.active} onCheckedChange={(v) => setField("active", v)} />
                        </label>
                    </div>
                </div>
            </div>

            {/* ── Editor ── */}
            <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className="max-w-6xl mx-auto px-6 py-8">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 block">
                        Answer <span className="text-red-400">*</span>
                    </Label>
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <BlogEditor
                            content={form.answer}
                            onChange={(html) => setField("answer", html)}
                            placeholder="Write the answer here..."
                            minHeight="300px"
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
