"use client";

import React from "react";
import type { PageSection } from "@/types/pages";
import { SECTION_REGISTRY } from "./sectionRegistry";

interface DynamicPageRendererProps {
  sections: PageSection[];
}

/**
 * Renders page sections by mapping each section to its registered component.
 * Only renders active sections, sorted by order.
 */
export function DynamicPageRenderer({ sections }: DynamicPageRendererProps) {
  const sorted = [...sections]
    .filter((s) => s.active !== false)
    .sort((a, b) => a.order - b.order);

  if (sorted.length === 0) return null;

  return (
    <>
      {sorted.map((section) => {
        const entry = SECTION_REGISTRY[section.type];
        if (!entry?.component) {
          // Section type has no render component — could be a data-only section
          // that the parent page handles manually. Skip silently.
          return null;
        }
        const Component = entry.component;
        return (
          <Component
            key={section._id}
            {...section}
            {...(section.data || {})}
          />
        );
      })}
    </>
  );
}
