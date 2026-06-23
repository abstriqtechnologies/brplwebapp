"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { getAdminRecords, type AdminRecord } from "@/apihelper/admin";
import { UserTable } from "@/components/admin/UserTable";
import { FilterBar, type FilterValues } from "@/components/admin/FilterBar";
import { toast } from "@/components/ui/use-toast";

export default function RegisteredUsersPage() {
    const [users, setUsers] = useState<AdminRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState<FilterValues>({});

    const fetchData = async (f: FilterValues) => {
        setIsLoading(true);
        try {
            const res = await getAdminRecords(page, 10, f.search || "", "users", f.startDate, f.endDate);
            if (res.ok && res.data) {
                setUsers(res.data.items);
                setTotalPages(res.data.pagination.pages);
                setTotal(res.data.pagination.total);
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to fetch users" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData(filters);
    }, [page]);

    const handleExport = () => {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.startDate) params.set("startDate", filters.startDate.toISOString());
        if (filters.endDate) params.set("endDate", filters.endDate.toISOString());
        window.open(`/api/admin/users/export?${params.toString()}`, "_blank");
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Registered Users</h1>
                    <p className="text-slate-500 mt-1">All registered users (paid and unpaid).</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExport} variant="outline" className="gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Export CSV
                    </Button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-lg h-10">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="font-medium whitespace-nowrap">{total} Records</span>
                    </div>
                </div>
            </div>

            <FilterBar onFilterChange={(f) => { setPage(1); setFilters(f); fetchData(f); }} />

            <UserTable
                users={users}
                isLoading={isLoading}
                type="users"
                page={page}
                totalPages={totalPages}
                totalRecords={total}
                onPageChange={setPage}
                onRefresh={() => fetchData(filters)}
            />
        </div>
    );
}