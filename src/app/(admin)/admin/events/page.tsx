"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { eventsApi } from "@/apihelper/admin";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/adminDate";

const STATUS_COLOR: Record<string, string> = {
    upcoming: "bg-blue-500",
    live: "bg-red-500",
    completed: "bg-slate-500",
    cancelled: "bg-orange-500",
};

export default function EventsPage() {
    return (
        <CrudPage
            title="Events"
            description="Tournaments, trials, and special events."
            api={eventsApi}
            searchFields={["title", "city", "venue", "state"]}
            fields={[
                { name: "title", label: "Title", type: "text", required: true },
                { name: "slug", label: "Slug", type: "text", required: true, placeholder: "my-event" },
                { name: "description", label: "Short Description", type: "textarea" },
                { name: "content", label: "Full Content (HTML/Markdown)", type: "textarea", rows: 6 },
                { name: "image", label: "Hero Image URL", type: "imageUrl" },
                { name: "venue", label: "Venue", type: "text" },
                { name: "city", label: "City", type: "text" },
                { name: "state", label: "State", type: "text" },
                { name: "startDate", label: "Start Date", type: "datetime-local", required: true },
                { name: "endDate", label: "End Date", type: "datetime-local" },
                {
                    name: "status",
                    label: "Status",
                    type: "select",
                    required: true,
                    options: [
                        { value: "upcoming", label: "Upcoming" },
                        { value: "live", label: "Live" },
                        { value: "completed", label: "Completed" },
                        { value: "cancelled", label: "Cancelled" },
                    ],
                },
            ]}
            columns={[
                { header: "Title", cell: (r) => <span className="font-medium">{r.title}</span> },
                { header: "City", cell: (r) => [r.city, r.state].filter(Boolean).join(", ") || "—" },
                { header: "Start", cell: (r) => formatDate(r.startDate) },
                { header: "Status", cell: (r) => <Badge className={STATUS_COLOR[r.status] || "bg-slate-500"}>{r.status}</Badge> },
            ]}
        />
    );
}