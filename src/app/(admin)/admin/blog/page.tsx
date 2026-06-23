"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { blogApi } from "@/apihelper/admin";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/adminDate";

export default function BlogAdminPage() {
    return (
        <CrudPage
            title="Blog"
            description="Articles and posts for the BRPL blog."
            api={blogApi}
            searchFields={["title", "excerpt"]}
            fields={[
                { name: "title", label: "Title", type: "text", required: true },
                { name: "slug", label: "Slug", type: "text", required: true },
                { name: "excerpt", label: "Excerpt", type: "textarea", rows: 3 },
                { name: "content", label: "Content (HTML/Markdown)", type: "textarea", required: true, rows: 10 },
                { name: "heroImage", label: "Hero Image URL", type: "imageUrl" },
                { name: "authorName", label: "Author Name", type: "text" },
                { name: "authorImage", label: "Author Photo URL", type: "imageUrl" },
                { name: "tags", label: "Tags (comma separated)", type: "tags" },
                { name: "publishedAt", label: "Publish At", type: "datetime-local" },
                { name: "draft", label: "Save as draft", type: "boolean" },
                { name: "views", label: "Views", type: "number" },
            ]}
            columns={[
                { header: "Title", cell: (r) => <span className="font-medium">{r.title}</span> },
                { header: "Author", cell: (r) => r.authorName || "—" },
                { header: "Published", cell: (r) => r.publishedAt ? formatDate(r.publishedAt) : "—" },
                { header: "Status", cell: (r) => <Badge variant={r.draft ? "secondary" : "default"}>{r.draft ? "Draft" : "Published"}</Badge> },
            ]}
        />
    );
}