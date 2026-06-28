"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { FileText, Search, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/apihelper/api";
import { cn } from "@/lib/utils";

type PageSummary = {
  key: string;
  label: string;
  sectionCount: number;
  updatedAt: string | null;
  createdAt: string | null;
};

const PAGE_SIZE = 15;

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageSummary[]>([]);
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

  useEffect(() => { setPage(1); }, [debouncedQuery]);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.get<{ ok: true; data: { pages: PageSummary[] } }>("/api/admin/pages");
    if (res.ok && res.data?.data?.pages) {
      let filtered = res.data.data.pages;
      if (debouncedQuery) {
        const q = debouncedQuery.toLowerCase();
        filtered = filtered.filter((p) => p.label.toLowerCase().includes(q) || p.key.includes(q));
      }
      setPages(filtered);
    } else {
      setError(res.error || "Failed to load pages");
    }
    setLoading(false);
  }, [debouncedQuery]);

  useEffect(() => { void fetchPages(); }, [fetchPages]);

  const totalPages = Math.max(1, Math.ceil(pages.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = pages.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showingFrom = pages.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(safePage * PAGE_SIZE, pages.length);

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <main className="p-6 min-w-0">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pages
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? "Loading…" : `${pages.length} page${pages.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="relative w-56">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
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
                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Page</th>
                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Key</th>
                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Sections</th>
                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Last Updated</th>
                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                Array.from({ length: 5 }).map((_, row) => (
                  <tr key={row}>
                    {Array.from({ length: 5 }).map((__, col) => (
                      <td key={col} className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="h-4 w-full max-w-24 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                    No pages found.
                  </td>
                </tr>
              )}
              {paginated.map((p) => (
                <tr key={p.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{p.label}</div>
                  </td>
                  <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.key}</span>
                  </td>
                  <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">{p.sectionCount}</span>
                  </td>
                  <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatDate(p.updatedAt)}
                  </td>
                  <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={`/admin/pages/${p.key}`} aria-label={`Edit ${p.label}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={cn(
          "flex items-center justify-between gap-3 px-3 py-2 border-t border-slate-200 dark:border-slate-800",
          "bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-400"
        )}>
          <span>{pages.length === 0 ? "0 results" : `Showing ${showingFrom}–${showingTo} of ${pages.length}`}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs">Page {safePage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1 || loading}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages || loading}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
