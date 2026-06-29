"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Newspaper, Search, ChevronLeft, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import api from "@/apihelper/api";
import { cn } from "@/lib/utils";

type NewsItem = {
    id: string;
    title: string;
    slug: string;
    summary: string;
    content: string;
    heroImage: string;
    featuredImage: string;
    tags: string[];
    source: string;
    sourceUrl: string;
    metaTitle: string;
    metaDescription: string;
    enableSchema: boolean;
    draft: boolean;
    views: number;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

const PAGE_SIZE = 15;

export default function AdminNewsPage() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [page, setPage] = useState(1);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQuery(query), 250);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    useEffect(() => {
        setPage(1);
    }, [debouncedQuery]);

    const fetchNews = useCallback(
        async (opts: { silent?: boolean } = {}) => {
            if (!opts.silent) {
                setLoading(true);
                setError(null);
            }
            const qs = new URLSearchParams({
                page: String(page),
                pageSize: String(PAGE_SIZE),
            });
            if (debouncedQuery) qs.set("search", debouncedQuery);

            const res = await api.get<{
                ok: true;
                data: { news: NewsItem[]; total: number; page: number; pageSize: number };
            }>(`/api/admin/news?${qs.toString()}`);
            if (res.ok && res.data?.data) {
                setNews(res.data.data.news);
                setTotal(res.data.data.total);
            } else if (!opts.silent) {
                setError(res.error || "Failed to load news articles");
            }
            if (!opts.silent) setLoading(false);
        },
        [page, debouncedQuery],
    );

    useEffect(() => {
        void fetchNews();
    }, [fetchNews]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            void fetchNews({ silent: true });
        }, 15_000);
        return () => window.clearInterval(timer);
    }, [fetchNews]);

    const handleToggleDraft = async (item: NewsItem) => {
        const next = !item.draft;
        setNews((prev) =>
            prev.map((n) =>
                n.id === item.id
                    ? { ...n, draft: next, ...(next ? {} : { publishedAt: new Date().toISOString() }) }
                    : n,
            ),
        );
        const res = await api.patch(`/api/admin/news/${item.id}`, { draft: next });
        if (!res.ok) {
            setNews((prev) =>
                prev.map((n) => (n.id === item.id ? { ...n, draft: item.draft } : n)),
            );
            window.alert(res.error || "Failed to update news status");
        }
    };

    const handleDelete = async (item: NewsItem) => {
        const ok = window.confirm(
            `Delete "${item.title}"? This cannot be undone.`,
        );
        if (!ok) return;
        const res = await api.delete(`/api/admin/news/${item.id}`);
        if (res.ok) {
            if (news.length === 1 && page > 1) setPage(page - 1);
            else void fetchNews();
        } else {
            window.alert(res.error || "Failed to delete news article");
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const showingFrom = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const showingTo = Math.min(safePage * PAGE_SIZE, total);

    return (
        <main className="p-6 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Newspaper className="h-5 w-5" />
                        News Articles
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {loading ? "Loading…" : `${total} article${total === 1 ? "" : "s"}`}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-nowrap">
                    <div className="relative w-56">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by title, source, summary…"
                            className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                    </div>
                    <Button size="sm" className="h-8 px-3 text-xs" asChild>
                        <a href="/admin/news/new">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            New News
                        </a>
                    </Button>
                </div>
            </div>

            {error && (
                <div className="mb-3 px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                    {error}
                </div>
            )}

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="overflow-auto max-h-[calc(100vh-220px)]">
                    <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            <tr className="text-left">
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Title
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Slug
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Source
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Tags
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Status
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Views
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Created
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700 w-24">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <NewsTableSkeleton />}
                            {!loading && news.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No news articles found.
                                    </td>
                                </tr>
                            )}
                            {news.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                                            {item.title}
                                        </div>
                                        {item.summary && (
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                                {item.summary}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                            {item.slug}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm">
                                        {item.source || "—"}
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <TagsBadge tags={item.tags} />
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={!item.draft}
                                                onCheckedChange={() => void handleToggleDraft(item)}
                                                aria-label={`Toggle ${item.title} draft status`}
                                            />
                                            <span
                                                className={cn(
                                                    "inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md",
                                                    item.draft
                                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                                                )}
                                            >
                                                {item.draft ? "Draft" : "Published"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                        {item.views}
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                        {formatDate(item.createdAt)}
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                asChild
                                            >
                                                <a
                                                    href={`/admin/news/${item.id}`}
                                                    aria-label={`Edit ${item.title}`}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                onClick={() => void handleDelete(item)}
                                                aria-label={`Delete ${item.title}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div
                    className={cn(
                        "flex items-center justify-between gap-3 px-3 py-2 border-t border-slate-200 dark:border-slate-800",
                        "bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-400",
                    )}
                >
                    <span>{total === 0 ? "0 results" : `Showing ${showingFrom}–${showingTo} of ${total}`}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs">
                            Page {safePage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={safePage <= 1 || loading}
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages || loading}
                            aria-label="Next page"
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}

// ---------- Helpers ----------

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function TagsBadge({ tags }: { tags: string[] }) {
    if (!tags || tags.length === 0) return <span className="text-slate-400 text-xs">—</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="inline-flex px-2 py-0.5 text-[10px] rounded-md bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                >
                    {tag}
                </span>
            ))}
        </div>
    );
}

function NewsTableSkeleton() {
    return (
        <>
            {Array.from({ length: 10 }).map((_, row) => (
                <tr key={row}>
                    {Array.from({ length: 8 }).map((__, col) => (
                        <td key={col} className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="h-4 w-full max-w-24 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}
