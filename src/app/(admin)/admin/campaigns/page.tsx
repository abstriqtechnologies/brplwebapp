"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { campaignsApi } from "@/apihelper/admin";
import { Badge } from "@/components/ui/badge";

export default function CampaignsPage() {
    return (
        <CrudPage
            title="QR Campaigns"
            description="Marketing campaigns with QR codes."
            api={campaignsApi}
            searchFields={["name", "slug"]}
            fields={[
                { name: "name", label: "Campaign Name", type: "text", required: true },
                { name: "slug", label: "Slug", type: "text", required: true, placeholder: "summer-2025" },
                { name: "description", label: "Description", type: "textarea", rows: 3 },
                { name: "qrCodeUrl", label: "QR Code URL", type: "imageUrl", required: true },
                { name: "targetUrl", label: "Target URL", type: "url", placeholder: "https://..." },
                { name: "hits", label: "Hit Count", type: "number" },
                { name: "active", label: "Active", type: "boolean" },
            ]}
            columns={[
                { header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
                { header: "Slug", cell: (r) => <code className="text-xs">{r.slug}</code> },
                { header: "Hits", cell: (r) => r.hits?.toLocaleString() || 0 },
                { header: "Status", cell: (r) => <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]}
        />
    );
}