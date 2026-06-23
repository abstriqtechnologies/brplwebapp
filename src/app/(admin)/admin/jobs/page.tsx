"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { jobsApi } from "@/apihelper/admin";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function JobsListPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Manage Jobs</h1>
                    <p className="text-slate-500 mt-1">Post and manage career opportunities.</p>
                </div>
                <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
                    <Link href="/admin/jobs/create">
                        <Plus className="w-4 h-4 mr-2" />
                        Post new job
                    </Link>
                </Button>
            </div>
            <CrudPage
                title=""
                api={jobsApi}
                searchFields={["title", "department", "location"]}
                fields={[
                    { name: "title", label: "Title", type: "text", required: true },
                    { name: "department", label: "Department", type: "text", required: true },
                    { name: "location", label: "Location", type: "text", required: true },
                    {
                        name: "type",
                        label: "Type",
                        type: "select",
                        required: true,
                        options: [
                            { value: "full-time", label: "Full-time" },
                            { value: "part-time", label: "Part-time" },
                            { value: "contract", label: "Contract" },
                            { value: "internship", label: "Internship" },
                        ],
                    },
                    { name: "description", label: "Description", type: "textarea", required: true, rows: 4 },
                    { name: "requirements", label: "Requirements", type: "textarea", rows: 4 },
                    { name: "applyBy", label: "Apply By", type: "date" },
                    { name: "active", label: "Active", type: "boolean" },
                ]}
                columns={[
                    { header: "Title", cell: (r) => <span className="font-medium">{r.title}</span> },
                    { header: "Department", cell: (r) => r.department },
                    { header: "Location", cell: (r) => r.location },
                    { header: "Type", cell: (r) => <Badge variant="outline" className="capitalize">{r.type}</Badge> },
                    {
                        header: "Status", cell: (r) => <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge>
                    },
                ]}
            />
        </div>
    );
}