"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { PageSection } from "@/types/pages";

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

export default function HeroBannerEditor({ section, onChange, defaultData }: Props) {
  const data = { ...defaultData, ...section };

  const update = (field: string, value: any) => {
    onChange({ ...section, [field]: value, data: { ...(section.data || {}), [field]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Active
        </Label>
        <Switch checked={section.active} onCheckedChange={(v) => onChange({ ...section, active: v })} />
      </div>

      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={data.title || ""} onChange={(e) => update("title", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Subtitle</Label>
        <Input value={data.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>CTA Text</Label>
        <Input value={data.ctaText || ""} onChange={(e) => update("ctaText", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>CTA Link</Label>
        <Input value={data.ctaLink || ""} onChange={(e) => update("ctaLink", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Background Image</Label>
        <ImageUpload value={data.image || ""} onChange={(url) => update("image", url)} />
      </div>

      <div className="space-y-1.5">
        <Label>Mobile Image (optional)</Label>
        <ImageUpload value={data.imageMobile || ""} onChange={(url) => update("imageMobile", url)} />
      </div>

      <div className="space-y-1.5">
        <Label>Video URL (optional — overrides image)</Label>
        <Input value={data.videoUrl || ""} onChange={(e) => update("videoUrl", e.target.value)} />
      </div>
    </div>
  );
}
