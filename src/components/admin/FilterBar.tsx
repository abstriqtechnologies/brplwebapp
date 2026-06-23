"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export interface FilterValues {
    search?: string;
    startDate?: Date;
    endDate?: Date;
    source?: string;
}

export function FilterBar({
    onFilterChange,
    showSource = false,
}: {
    onFilterChange: (filters: FilterValues) => void;
    showSource?: boolean;
}) {
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [source, setSource] = useState("");

    const apply = () => {
        onFilterChange({
            search: search || undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            source: source || undefined,
        });
    };

    const reset = () => {
        setSearch("");
        setStartDate("");
        setEndDate("");
        setSource("");
        onFilterChange({});
    };

    return (
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
            <div className="flex-1">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, email, phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && apply()}
                        className="pl-10"
                    />
                </div>
            </div>
            <div className="w-full md:w-40">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="w-full md:w-40">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {showSource && (
                <div className="w-full md:w-40">
                    <Input placeholder="Source" value={source} onChange={(e) => setSource(e.target.value)} />
                </div>
            )}
            <Button onClick={apply} className="bg-amber-500 text-black hover:bg-amber-400">
                Apply
            </Button>
            <Button onClick={reset} variant="outline">
                <X className="w-4 h-4 mr-1" /> Reset
            </Button>
        </div>
    );
}
