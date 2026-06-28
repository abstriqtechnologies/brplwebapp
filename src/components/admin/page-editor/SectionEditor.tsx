"use client";

import React from "react";
import type { PageSection } from "@/types/pages";
import { SECTION_REGISTRY } from "./sectionRegistry";

interface SectionEditorProps {
  section: PageSection;
  onChange: (updated: PageSection) => void;
}

export function SectionEditor({ section, onChange }: SectionEditorProps) {
  const entry = SECTION_REGISTRY[section.type];

  if (!entry?.editor) {
    return (
      <div className="p-4 text-sm text-slate-500 bg-slate-50 rounded-lg">
        No editor available for section type &quot;{section.type}&quot;.
      </div>
    );
  }

  const EditorComponent = entry.editor;
  return (
    <EditorComponent
      section={section}
      onChange={onChange}
      defaultData={entry.defaultData}
    />
  );
}
