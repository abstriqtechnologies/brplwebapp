"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { partnersApi } from "@/apihelper/admin";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
    new: "bg-blue-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
    active: "bg-emerald-600",
};

export default function PartnersPage() {
    return (
        <CrudPage
            title="Partners"
            description="League partners and partner applications."
            api={partnersApi}
            searchFields={["name", "contactName", "contactEmail"]}
            fields={[
                { name: "name", label: "Partner Name", type: "text", required: true },
                {
                    name: "type", label: "Type", type: "select", required: true,
                    options: [
                        { value: "title", label: "Title Sponsor" },
                        { value: "broadcasting", label: "Broadcasting Partner" },
                        { value: "sponsor", label: "Sponsor" },
                        { value: "associate", label: "Associate" },
                        { value: "media", label: "Media Partner" },
                    ],
                },
                { name: "logo", label: "Logo URL", type: "imageUrl" },
                { name: "website", label: "Website", type: "url", placeholder: "https://..." },
                { name: "description", label: "Description", type: "textarea", rows: 3 },
                { name: "contactName", label: "Contact Name", type: "text" },
                { name: "contactEmail", label: "Contact Email", type: "email" },
                { name: "contactPhone", label: "Contact Phone", type: "text" },
                { name: "message", label: "Message / Notes", type: "textarea", rows: 3 },
                {
                    name: "status", label: "Status", type: "select", required: true,
                    options: [
                        { value: "new", label: "New" },
                        { value: "approved", label: "Approved" },
                        { value: "rejected", label: "Rejected" },
                        { value: "active", label: "Active" },
                    ],
                },
                { name: "order", label: "Sort Order", type: "number" },
            ]}
            columns={[
                { header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
                { header: "Type", cell: (r) => <Badge variant="outline" className="capitalize">{r.type}</Badge> },
                { header: "Contact", cell: (r) => r.contactName || "—" },
                { header: "Status", cell: (r) => <Badge className={STATUS_COLORS[r.status] || "bg-slate-500"}>{r.status}</Badge> },
            ]}
        />
    );
}