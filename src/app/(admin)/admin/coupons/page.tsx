"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/apihelper/admin";
import { Badge } from "@/components/ui/badge";

export default function CouponsPage() {
    return (
        <CrudPage
            title="Coupons"
            description="Create and manage discount coupons."
            api={{
                list: (page, limit, search) => listCoupons(page, limit, search),
                create: (b) => createCoupon(b),
                update: (id, b) => updateCoupon(id, b),
                remove: (id) => deleteCoupon(id),
            }}
            searchFields={["code", "description"]}
            fields={[
                { name: "code", label: "Code", type: "text", required: true, placeholder: "BRPL20" },
                { name: "description", label: "Description", type: "text", placeholder: "Launch offer" },
                {
                    name: "type",
                    label: "Type",
                    type: "select",
                    required: true,
                    options: [
                        { value: "percent", label: "Percent (%)" },
                        { value: "flat", label: "Flat (Rs.)" },
                    ],
                },
                { name: "amount", label: "Amount", type: "number", required: true },
                { name: "usageLimit", label: "Usage Limit (0 = unlimited)", type: "number" },
                { name: "minOrderAmount", label: "Min Order Amount", type: "number" },
                { name: "expiresAt", label: "Expires At", type: "datetime-local" },
                { name: "active", label: "Active", type: "boolean" },
            ]}
            columns={[
                {
                    header: "Code",
                    cell: (r) => <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{r.code}</span>,
                },
                { header: "Description", cell: (r) => r.description || "—" },
                {
                    header: "Discount",
                    cell: (r) => <span className="font-medium">{r.type === "percent" ? `${r.amount}%` : `Rs. ${r.amount}`}</span>,
                },
                {
                    header: "Usage",
                    cell: (r) => (
                        <span className="text-sm">
                            {r.usedCount} / {r.usageLimit === 0 ? "∞" : r.usageLimit}
                        </span>
                    ),
                },
                {
                    header: "Status",
                    cell: (r) => (
                        <Badge variant={r.active ? "default" : "secondary"}>
                            {r.active ? "Active" : "Inactive"}
                        </Badge>
                    ),
                },
            ]}
        />
    );
}