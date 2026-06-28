"use client";

import React from "react";
import type { PageSection } from "@/types/pages";

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

export default function TrustBarEditor({ section, onChange, defaultData }: Props) {
  return (
    <div className="p-4 text-sm text-slate-500">
      Trust Bar editor &mdash; uses data.items array
    </div>
  );
}
