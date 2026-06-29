"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PenSquare, Search, ChevronLeft, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import api from "@/apihelper/api";
import { cn } from "@/lib/utils";

type Blog = {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    heroImage: string;
    featuredImage: string;
    tags: string[];
    authorName: string;
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

export default function AdminBlogsPage() {
    const [blogs, setBlogs] = useState<Blog[]>([]);
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

    const fetchBlogs = useCallback(
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
                data: { blogs: Blog[]; total: number; page: number; pageSize: number };
            }>(`/api/admin/blogs?${qs.toString()}`);
            if (res.ok && res.data?.data) {
                setBlogs(res.data.data.blogs);
                setTotal(res.data.data.total);
            } else if (!opts.silent) {
                setError(res.error || "Failed to load blog posts");
            }
            if (!opts.silent) setLoading(false);
        },
        [page, debouncedQuery],
    );

    useEffect(() => {
        void fetchBlogs();
    }, [fetchBlogs]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            void fetchBlogs({ silent: true });
        }, 15_000);
        return () => window.clearInterval(timer);
    }, [fetchBlogs]);

    const handleToggleDraft = async (blog: Blog) => {
        const next = !blog.draft;
        setBlogs((prev) =>
            prev.map((b) =>
                b.id === blog.id
                    ? { ...b, draft: next, ...(next ? {} : { publishedAt: new Date().toISOString() }) }
                    : b,
            ),
        );
        const res = await api.patch(`/api/admin/blogs/${blog.id}`, { draft: next });
        if (!res.ok) {
            setBlogs((prev) =>
                prev.map((b) => (b.id === blog.id ? { ...b, draft: blog.draft } : b)),
            );
            window.alert(res.error || "Failed to update blog status");
        }
    };

    const handleDelete = async (blog: Blog) => {
        const ok = window.confirm(
            `Delete "${blog.title}"? This cannot be undone.`,
        );
        if (!ok) return;
        const res = await api.delete(`/api/admin/blogs/${blog.id}`);
        if (res.ok) {
            if (blogs.length === 1 && page > 1) setPage(page - 1);
            else void fetchBlogs();
        } else {
            window.alert(res.error || "Failed to delete blog post");
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
                        <PenSquare className="h-5 w-5" />
                        Blog Posts
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {loading ? "Loading…" : `${total} post${total === 1 ? "" : "s"}`}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-nowrap">
                    <div className="relative w-56">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by title, author, tags…"
                            className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                    </div>
                    <Button size="sm" className="h-8 px-3 text-xs" asChild>
                        <a href="/admin/blogs/new">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            New Blog
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
                                    Author
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
                            {loading && <BlogTableSkeleton />}
                            {!loading && blogs.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No blog posts found.
                                    </td>
                                </tr>
                            )}
                            {blogs.map((blog) => (
                                <tr key={blog.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                                            {blog.title}
                                        </div>
                                        {blog.excerpt && (
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                                {blog.excerpt}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                            {blog.slug}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm">
                                        {blog.authorName || "—"}
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <TagsBadge tags={blog.tags} />
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={!blog.draft}
                                                onCheckedChange={() => void handleToggleDraft(blog)}
                                                aria-label={`Toggle ${blog.title} draft status`}
                                            />
                                            <span
                                                className={cn(
                                                    "inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md",
                                                    blog.draft
                                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                                                )}
                                            >
                                                {blog.draft ? "Draft" : "Published"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                        {blog.views}
                                    </td>
                                    <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                        {formatDate(blog.createdAt)}
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
                                                    href={`/admin/blogs/${blog.id}`}
                                                    aria-label={`Edit ${blog.title}`}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                onClick={() => void handleDelete(blog)}
                                                aria-label={`Delete ${blog.title}`}
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

function BlogTableSkeleton() {
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
