"use client";

import { CmsForm } from "@/components/admin/CmsForm";
import { getLegal, updateLegal } from "@/apihelper/admin";

export default function TermsPage() {
    return (
        <CmsForm
            title="Terms & Conditions"
            description="Public-facing terms of service."
            getData={() => getLegal("terms")}
            saveData={(body) => updateLegal("terms", body)}
            fields={[
                { name: "title", label: "Title", type: "text", required: true },
                { name: "version", label: "Version", type: "text", placeholder: "1.0" },
                { name: "effectiveDate", label: "Effective Date (text)", type: "text", placeholder: "2026-01-01" },
                { name: "content", label: "Content (HTML/Markdown)", type: "textarea", required: true, rows: 16 },
            ]}
        />
    );
}
