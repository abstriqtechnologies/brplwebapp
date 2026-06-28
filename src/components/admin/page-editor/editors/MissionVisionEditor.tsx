"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { PageSection } from "@/types/pages";

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

export default function MissionVisionEditor({ section, onChange, defaultData }: Props) {
  const data = { ...defaultData, section, ...(section.data || {}) };

  const update = (field: string, value: any) => {
    onChange({
      ...section,
      data: { ...(section.data || {}), [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active</Label>
        <Switch checked={section.active} onCheckedChange={(v) => onChange({ ...section, active: v })} />
      </div>

      <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
        <h3 className="font-semibold text-sm">Mission</h3>
        <div className="space-y-1.5">
          <Label>Mission Title</Label>
          <Input value={data.missionTitle || ""} onChange={(e) => update("missionTitle", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Mission Description (Rich Text)</Label>
          <BlogEditor
            content={data.missionDescription || ""}
            onChange={(html) => update("missionDescription", html)}
            placeholder="Enter mission content..."
            minHeight="150px"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mission Image</Label>
          <ImageUpload value={data.missionImage || ""} onChange={(url) => update("missionImage", url)} />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
        <h3 className="font-semibold text-sm">Vision</h3>
        <div className="space-y-1.5">
          <Label>Vision Title</Label>
          <Input value={data.visionTitle || ""} onChange={(e) => update("visionTitle", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Vision Description (Rich Text)</Label>
          <BlogEditor
            content={data.visionDescription || ""}
            onChange={(html) => update("visionDescription", html)}
            placeholder="Enter vision content..."
            minHeight="150px"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Vision Image</Label>
          <ImageUpload value={data.visionImage || ""} onChange={(url) => update("visionImage", url)} />
        </div>
      </div>
    </div>
  );
}
