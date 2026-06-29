"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionEditor } from "@/components/admin/page-editor/SectionEditor";
import { PAGE_REGISTRY } from "@/lib/pageRegistry";
import { cn } from "@/lib/utils";
import api from "@/apihelper/api";
import type { PageSection } from "@/types/pages";

export default function PageEditorClient({ pageKey }: { pageKey: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [sections, setSections] = useState<PageSection[]>([]);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);

  const config = PAGE_REGISTRY[pageKey];

  useEffect(() => {
    if (!config) {
      setError(`Unknown page key: ${pageKey}`);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get<{ ok: boolean; data?: { page: any } }>(`/api/admin/pages/${pageKey}`)
      .then((res) => {
        if (res.ok && res.data?.data?.page) {
          const p = res.data.data.page;
          setPageTitle(p.title || config.label);
          // Hydrate sections from registry + DB.
          // If DB has sections, use those. If DB has fewer than registry defines,
          // pad with registry defaults so every registry section is editable.
          const dbSections: PageSection[] = Array.isArray(p.sections) ? p.sections : [];
          const configSections = config.sections;
          const merged: PageSection[] = configSections.map((sc, i) => {
            const existing = dbSections.find((s) => s.type === sc.type && s.order === i);
            if (existing) return existing;
            const fallback = dbSections[i];
            if (fallback) return fallback;
            // Brand new section: start with default skeleton
            return {
              _id: `new-${sc.type}-${i}`,
              type: sc.type,
              order: i,
              title: sc.label,
              subtitle: "",
              description: "",
              image: "",
              imageMobile: "",
              videoUrl: "",
              ctaText: "",
              ctaLink: "",
              data: {},
              active: true,
            };
          });
          setSections(merged);
        } else {
          setError(res.error || "Failed to load page");
        }
      })
      .catch(() => setError("Failed to load page"))
      .finally(() => setLoading(false));
  }, [pageKey, config]);

  const handleSectionChange = useCallback((index: number, updated: PageSection) => {
    setSections((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
    setSuccess(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await api.patch(`/api/admin/pages/${pageKey}`, {
      title: pageTitle,
      sections,
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(res.error || "Failed to save");
    }

    setSaving(false);
  }, [pageKey, pageTitle, sections]);

  if (!config) {
    return (
      <main className="p-6">
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          Page &quot;{pageKey}&quot; not found in registry.
        </div>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/pages">Back to Pages</Link>
        </Button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/pages"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Back to pages"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{config.label}</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Editing: {pageKey}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {error && (
              <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
            )}
            {success && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved!</span>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/pages")} disabled={saving} className="h-8 px-3 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 px-4 text-xs bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Page title */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-2">
        <div className="space-y-1.5 max-w-md">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Page Title (SEO)</Label>
          <Input value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      {/* Section editor area */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Section sidebar */}
        <div className="w-56 shrink-0 space-y-1">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Sections</Label>
          {config.sections.map((sc, i) => {
            const sectionData = sections[i];
            const isActive = sectionData?.active !== false;
            const isSelected = selectedSectionIndex === i;
            return (
              <button
                key={sc.type}
                onClick={() => setSelectedSectionIndex(i)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  isSelected
                    ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50",
                  !isActive && "opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isActive ? "bg-emerald-500" : "bg-slate-300")} />
                  <span className="truncate">{sc.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor content */}
        <div className="flex-1 min-w-0">
          {sections[selectedSectionIndex] ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
              <SectionEditor
                section={sections[selectedSectionIndex]}
                onChange={(updated) => handleSectionChange(selectedSectionIndex, updated)}
              />
            </div>
          ) : (
            <div className="p-6 text-slate-500 text-sm">Select a section to edit.</div>
          )}
        </div>
      </div>
    </main>
  );
}
