"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { teamsApi } from "@/apihelper/admin";
import { Badge } from "@/components/ui/badge";

export default function TeamsPage() {
    return (
        <CrudPage
            title="Teams"
            description="Members of the BRPL team."
            api={teamsApi}
            searchFields={["name", "role", "department"]}
            fields={[
                { name: "name", label: "Name", type: "text", required: true },
                { name: "role", label: "Role", type: "text", required: true, placeholder: "Founder, Coach, ..." },
                { name: "department", label: "Department", type: "text" },
                { name: "image", label: "Photo URL", type: "imageUrl" },
                { name: "bio", label: "Bio", type: "textarea", rows: 4 },
                { name: "email", label: "Email", type: "email" },
                { name: "linkedin", label: "LinkedIn URL", type: "url" },
                { name: "twitter", label: "Twitter URL", type: "url" },
                { name: "order", label: "Sort Order", type: "number" },
                { name: "active", label: "Active", type: "boolean" },
            ]}
            columns={[
                { header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
                { header: "Role", cell: (r) => r.role },
                { header: "Department", cell: (r) => r.department || "—" },
                { header: "Status", cell: (r) => <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]}
        />
    );
}