"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { newsApi } from "@/apihelper/admin";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/adminDate";

export default function NewsAdminPage() {
    return (
        <CrudPage
            title="News Articles"
            description="News coverage and press articles."
            api={newsApi}
            searchFields={["title", "summary", "source"]}
            fields={[
                { name: "title", label: "Title", type: "text", required: true },
                { name: "slug", label: "Slug", type: "text", required: true },
                { name: "summary", label: "Summary", type: "textarea", rows: 3 },
                { name: "content", label: "Content (HTML/Markdown)", type: "textarea", required: true, rows: 10 },
                { name: "heroImage", label: "Hero Image URL", type: "imageUrl" },
                { name: "source", label: "Source", type: "text", placeholder: "ESPN, Cricbuzz, ..." },
                { name: "sourceUrl", label: "Source URL", type: "url" },
                { name: "tags", label: "Tags (comma separated)", type: "tags" },
                { name: "publishedAt", label: "Publish At", type: "datetime-local" },
                { name: "draft", label: "Save as draft", type: "boolean" },
                { name: "views", label: "Views", type: "number" },
            ]}
            columns={[
                { header: "Title", cell: (r) => <span className="font-medium">{r.title}</span> },
                { header: "Source", cell: (r) => r.source || "—" },
                { header: "Published", cell: (r) => r.publishedAt ? formatDate(r.publishedAt) : "—" },
                { header: "Status", cell: (r) => <Badge variant={r.draft ? "secondary" : "default"}>{r.draft ? "Draft" : "Published"}</Badge> },
            ]}
        />
    );
}