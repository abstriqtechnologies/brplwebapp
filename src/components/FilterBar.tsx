"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PaymentStatusFilter = 'paid' | 'unpaid' | 'all';

export interface FilterBarFilter {
    search: string;
    startDate?: Date;
    endDate?: Date;
    source?: string;
    paymentStatus?: PaymentStatusFilter;
}

interface FilterBarProps {
    onFilterChange: (filters: FilterBarFilter) => void;
    /** Initial source (e.g. "landing") so dropdown shows correct value on load */
    defaultSource?: string;
    /** Show Payment status dropdown (Paid / Unpaid / All) */
    showPaymentFilter?: boolean;
    /** Initial payment status when showPaymentFilter is true */
    defaultPaymentStatus?: PaymentStatusFilter;
}

export const FilterBar = ({ onFilterChange, defaultSource = "all", showPaymentFilter = false, defaultPaymentStatus = "all" }: FilterBarProps) => {
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [source, setSource] = useState<string>(defaultSource);
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatusFilter>(defaultPaymentStatus);

    const handleApply = () => {
        onFilterChange({
            search,
            startDate,
            endDate,
            source: source === "all" ? undefined : source,
            ...(showPaymentFilter && { paymentStatus })
        });
    };

    const handleClear = () => {
        setSearch("");
        setStartDate(undefined);
        setEndDate(undefined);
        setSource(defaultSource);
        setPaymentStatus(defaultPaymentStatus);
        onFilterChange({
            search: "",
            source: defaultSource === "all" ? undefined : defaultSource,
            ...(showPaymentFilter && { paymentStatus: defaultPaymentStatus })
        });
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                />
            </div>

            <div className="flex gap-2 flex-wrap">
                <Select value={source} onValueChange={(val) => setSource(val)}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="landing">Landing Page</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                    </SelectContent>
                </Select>

                {showPaymentFilter && (
                    <Select value={paymentStatus} onValueChange={(val) => setPaymentStatus(val as PaymentStatusFilter)}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Payment" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="unpaid">Unpaid</SelectItem>
                            <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !startDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? (
                                endDate ? (
                                    <>
                                        {format(startDate, "LLL dd, y")} -{" "}
                                        {format(endDate, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(startDate, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={startDate}
                            selected={{ from: startDate, to: endDate }}
                            onSelect={(range) => {
                                setStartDate(range?.from);
                                setEndDate(range?.to);
                            }}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>

                <Button onClick={handleApply}>Apply</Button>
                <Button variant="ghost" onClick={handleClear} size="icon" title="Reset Filters">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
