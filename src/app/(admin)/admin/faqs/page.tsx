"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { faqsApi } from "@/apihelper/admin";
import { Badge } from "@/components/ui/badge";

export default function FAQsPage() {
    return (
        <CrudPage
            title="Manage FAQs"
            description="Frequently asked questions displayed on the public site."
            api={faqsApi}
            searchFields={["question", "answer", "category"]}
            fields={[
                { name: "question", label: "Question", type: "text", required: true },
                { name: "answer", label: "Answer", type: "textarea", required: true, rows: 4 },
                { name: "category", label: "Category", type: "text", placeholder: "general, registration, ..." },
                { name: "order", label: "Sort Order", type: "number" },
                { name: "active", label: "Active", type: "boolean" },
            ]}
            columns={[
                { header: "Question", cell: (r) => <span className="font-medium">{r.question}</span> },
                { header: "Answer", cell: (r) => <span className="text-slate-500 text-sm line-clamp-2 max-w-md">{r.answer}</span> },
                { header: "Category", cell: (r) => <Badge variant="outline" className="capitalize">{r.category}</Badge> },
                { header: "Status", cell: (r) => <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]}
        />
    );
}