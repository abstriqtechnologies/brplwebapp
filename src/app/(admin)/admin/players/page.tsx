"use client";

import { useEffect, useState, useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import api from "@/apihelper/api";

const PAYMENT_FILTER_ALL = "all";
const STATE_FILTER_ALL = "all";
const COUPON_FILTER_ALL = "all";
const COUPON_FILTER_NONE = "none";

type Player = {
    id: string;
    name: string;
    phone: string;
    city: string;
    state: string;
    paymentStatus: "pending" | "completed" | "—";
    couponCode: string;
    couponDiscount: number | null;
    registrationDate: string;
};

const PAGE_SIZE = 15;

export default function AdminPlayersPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [stateFilter, setStateFilter] = useState<string>(STATE_FILTER_ALL);
    const [paymentFilter, setPaymentFilter] = useState<string>(PAYMENT_FILTER_ALL);
    const [couponFilter, setCouponFilter] = useState<string>(COUPON_FILTER_ALL);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [page, setPage] = useState(1);

    // Unique, non-empty states derived from the loaded data.
    const stateOptions = useMemo(() => {
        const set = new Set<string>();
        for (const p of players) {
            if (p.state && p.state !== "—") set.add(p.state);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [players]);

    const couponOptions = useMemo(() => {
        const set = new Set<string>();
        for (const p of players) {
            if (p.couponCode && p.couponCode !== "—") set.add(p.couponCode);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [players]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            const res = await api.get<{ ok: true; data: { players: Player[] } }>("/api/admin/players");
            if (cancelled) return;
            if (res.ok && res.data?.data?.players) {
                setPlayers(res.data.data.players);
            } else {
                setError(res.error || "Failed to load players");
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const { from, to } = dateRange ?? {};
        // Inclusive end-of-day for `to`, so a player registered on `to` is included.
        const toEnd = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999) : undefined;
        const fromStart = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0) : undefined;

        return players.filter((p) => {
            if (stateFilter !== STATE_FILTER_ALL && p.state !== stateFilter) return false;
            if (paymentFilter !== PAYMENT_FILTER_ALL && p.paymentStatus !== paymentFilter) return false;
            if (couponFilter === COUPON_FILTER_NONE && p.couponCode !== "—") return false;
            if (
                couponFilter !== COUPON_FILTER_ALL &&
                couponFilter !== COUPON_FILTER_NONE &&
                p.couponCode !== couponFilter
            ) {
                return false;
            }
            if (fromStart || toEnd) {
                const d = new Date(p.registrationDate);
                if (Number.isNaN(d.getTime())) return false;
                if (fromStart && d < fromStart) return false;
                if (toEnd && d > toEnd) return false;
            }
            if (!q) return true;
            return [
                p.name,
                p.phone,
                p.city,
                p.state,
                p.paymentStatus,
                p.couponCode,
                formatRegistrationDate(p.registrationDate),
            ]
                .join(" ")
                .toLowerCase()
                .includes(q);
        });
    }, [players, query, stateFilter, paymentFilter, couponFilter, dateRange]);

    // Reset to page 1 when the filtered set shrinks/grows (e.g. on search).
    useEffect(() => {
        setPage(1);
    }, [query, stateFilter, paymentFilter, couponFilter, dateRange]);

    const filtersActive =
        stateFilter !== STATE_FILTER_ALL ||
        paymentFilter !== PAYMENT_FILTER_ALL ||
        couponFilter !== COUPON_FILTER_ALL ||
        query.length > 0 ||
        Boolean(dateRange?.from || dateRange?.to);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);
    const showingFrom = filtered.length === 0 ? 0 : pageStart + 1;
    const showingTo = Math.min(pageStart + PAGE_SIZE, filtered.length);

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
            <AdminSidebar />

            <main className="flex-1 p-6 min-w-0">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Players</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {loading
                                ? "Loading…"
                                : `${filtered.length} of ${players.length} player${players.length === 1 ? "" : "s"}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-nowrap">
                        <div className="relative w-48">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search…"
                                className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                        </div>

                        <Select value={stateFilter} onValueChange={setStateFilter}>
                            <SelectTrigger className="h-8 w-32 text-xs px-2">
                                <SelectValue placeholder="State" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={STATE_FILTER_ALL}>All states</SelectItem>
                                {stateOptions.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                            <SelectTrigger className="h-8 w-32 text-xs px-2">
                                <SelectValue placeholder="Payment" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={PAYMENT_FILTER_ALL}>All payments</SelectItem>
                                <SelectItem value="completed">Paid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={couponFilter} onValueChange={setCouponFilter}>
                            <SelectTrigger className="h-8 w-36 text-xs px-2">
                                <SelectValue placeholder="Coupon" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={COUPON_FILTER_ALL}>All coupons</SelectItem>
                                <SelectItem value={COUPON_FILTER_NONE}>No coupon</SelectItem>
                                {couponOptions.map((code) => (
                                    <SelectItem key={code} value={code}>
                                        {code}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <DateRangePicker value={dateRange} onChange={setDateRange} />

                        {filtersActive && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => {
                                    setQuery("");
                                    setStateFilter(STATE_FILTER_ALL);
                                    setPaymentFilter(PAYMENT_FILTER_ALL);
                                    setCouponFilter(COUPON_FILTER_ALL);
                                    setDateRange(undefined);
                                }}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-3 px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )}

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                    <div className="overflow-auto max-h-[calc(100vh-220px)]">
                        <table className="w-full text-sm border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                                <tr className="text-left">
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Name
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Phone
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        City
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        State
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Payment
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Coupon
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Registration Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loading && filtered.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                                        >
                                            No players found.
                                        </td>
                                    </tr>
                                )}
                                {pageRows.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                            {p.name}
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap">
                                            {p.phone}
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {p.city}
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {p.state}
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                                            <PaymentBadge status={p.paymentStatus} />
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                                            <CouponBadge code={p.couponCode} discount={p.couponDiscount} />
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {formatRegistrationDate(p.registrationDate)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination footer */}
                    <div
                        className={cn(
                            "flex items-center justify-between gap-3 px-3 py-2 border-t border-slate-200 dark:border-slate-800",
                            "bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-400",
                        )}
                    >
                        <span>
                            {filtered.length === 0
                                ? "0 results"
                                : `Showing ${showingFrom}–${showingTo} of ${filtered.length}`}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs">
                                Page {safePage} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={safePage <= 1 || loading}
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safePage >= totalPages || loading}
                                aria-label="Next page"
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function formatRegistrationDate(iso: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    // e.g. "28 Jun 2026"
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function DateRangePicker({
    value,
    onChange,
}: {
    value: DateRange | undefined;
    onChange: (range: DateRange | undefined) => void;
}) {
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const label = (() => {
        if (value?.from && value.to) return `${fmt(value.from)} – ${fmt(value.to)}`;
        if (value?.from) return `${fmt(value.from)} – …`;
        return "Date range";
    })();

    const active = Boolean(value?.from || value?.to);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center justify-between gap-1.5 h-8 w-44 px-2 text-xs rounded-md border bg-white dark:bg-slate-900",
                        "focus:outline-none focus:ring-2 focus:ring-amber-400",
                        active
                            ? "border-amber-400 text-amber-800 dark:text-amber-200"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
                    )}
                    aria-label="Registration date range"
                >
                    <span className="flex items-center gap-1.5 truncate">
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{label}</span>
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="range" numberOfMonths={2} selected={value} onSelect={onChange} initialFocus />
                {active && (
                    <div className="border-t border-slate-200 dark:border-slate-700 p-2 flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => onChange(undefined)}
                        >
                            Clear dates
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

function PaymentBadge({ status }: { status: Player["paymentStatus"] }) {
    if (status === "completed") {
        return (
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                Paid
            </span>
        );
    }
    if (status === "pending") {
        return (
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Pending
            </span>
        );
    }
    return (
        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            —
        </span>
    );
}

function CouponBadge({ code, discount }: { code: string; discount: number | null }) {
    if (!code || code === "—") {
        return <span className="text-slate-400 dark:text-slate-500">—</span>;
    }
    return (
        <div className="inline-flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900">
                {code}
            </span>
            {typeof discount === "number" && discount > 0 && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">₹{discount}</span>
            )}
        </div>
    );
}
