"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { ambassadorsApi } from "@/apihelper/admin";
import { Badge } from "@/components/ui/badge";

export default function AmbassadorsPage() {
    return (
        <CrudPage
            title="Ambassadors"
            description="Brand ambassadors for the league."
            api={ambassadorsApi}
            searchFields={["name", "city", "designation"]}
            fields={[
                { name: "name", label: "Name", type: "text", required: true },
                { name: "image", label: "Image URL", type: "imageUrl" },
                { name: "designation", label: "Designation", type: "text" },
                { name: "city", label: "City", type: "text" },
                { name: "bio", label: "Bio", type: "textarea", rows: 4 },
                { name: "instagram", label: "Instagram URL", type: "url", placeholder: "https://instagram.com/..." },
                { name: "twitter", label: "Twitter URL", type: "url" },
                { name: "linkedin", label: "LinkedIn URL", type: "url" },
                { name: "order", label: "Sort Order", type: "number" },
                { name: "active", label: "Active", type: "boolean" },
            ]}
            columns={[
                { header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
                { header: "City", cell: (r) => r.city || "—" },
                { header: "Designation", cell: (r) => r.designation || "—" },
                { header: "Status", cell: (r) => <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]}
        />
    );
}