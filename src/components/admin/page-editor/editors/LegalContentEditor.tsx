"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import type { PageSection } from "@/types/pages";

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

export default function LegalContentEditor({ section, onChange, defaultData }: Props) {
  const data = { ...defaultData, ...(section.data || {}) };
  const update = (field: string, value: any) => onChange({ ...section, data: { ...(section.data || {}), [field]: value } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active</Label>
        <Switch checked={section.active} onCheckedChange={(v) => onChange({ ...section, active: v })} />
      </div>
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={data.title || ""} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Content (Rich Text — full legal document)</Label>
        <BlogEditor content={data.content || ""} onChange={(html) => update("content", html)} minHeight="500px" />
      </div>
    </div>
  );
}
