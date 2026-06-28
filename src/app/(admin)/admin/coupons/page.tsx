"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Trash2,
    Plus,
    Ticket,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import api from "@/apihelper/api";

type CouponType = "flat" | "percent";

type Coupon = {
    id: string;
    code: string;
    description: string;
    type: CouponType;
    amount: number;
    usageLimit: number;
    usedCount: number;
    minOrderAmount: number | null;
    active: boolean;
    expiresAt: string | null;
    createdAt: string;
};

type CouponFormValues = {
    code: string;
    description: string;
    type: CouponType;
    amount: string; // string in form, parsed on submit
    usageLimit: string;
    minOrderAmount: string;
    active: boolean;
    expiresAt: string; // yyyy-mm-dd or ""
};

const PAGE_SIZE = 15;

export default function AdminCouponsPage() {
    const { me } = useAdminAuth();
    const canManage = me?.role === "superadmin" || me?.role === "subadmin";

    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [page, setPage] = useState(1);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Coupon | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Debounce search input.
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQuery(query), 250);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    // Reset to page 1 when search changes.
    useEffect(() => {
        setPage(1);
    }, [debouncedQuery]);

    const fetchCoupons = useCallback(async () => {
        setLoading(true);
        setError(null);
        const qs = new URLSearchParams({
            page: String(page),
            pageSize: String(PAGE_SIZE),
        });
        if (debouncedQuery) qs.set("search", debouncedQuery);

        const res = await api.get<{
            ok: true;
            data: { coupons: Coupon[]; total: number };
        }>(`/api/admin/coupons?${qs.toString()}`);
        if (res.ok && res.data?.data) {
            setCoupons(res.data.data.coupons);
            setTotal(res.data.data.total);
        } else {
            setError(res.error || "Failed to load coupons");
        }
        setLoading(false);
    }, [page, debouncedQuery]);

    useEffect(() => {
        void fetchCoupons();
    }, [fetchCoupons]);

    const openCreate = () => {
        setEditing(null);
        setFormError(null);
        setDialogOpen(true);
    };

    const openEdit = (c: Coupon) => {
        setEditing(c);
        setFormError(null);
        setDialogOpen(true);
    };

    const handleDelete = async (c: Coupon) => {
        const ok = window.confirm(
            `Delete coupon "${c.code}"? This cannot be undone. If the coupon has already been used, existing redemptions will not be reversed.`,
        );
        if (!ok) return;
        const res = await api.delete(`/api/admin/coupons/${c.id}`);
        if (res.ok) {
            // If we deleted the last item on this page, step back.
            if (coupons.length === 1 && page > 1) setPage(page - 1);
            else void fetchCoupons();
        } else {
            window.alert(res.error || "Failed to delete coupon");
        }
    };

    const handleToggleActive = async (c: Coupon) => {
        // Optimistic update.
        const next = !c.active;
        setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: next } : x)));
        const res = await api.patch(`/api/admin/coupons/${c.id}`, { active: next });
        if (!res.ok) {
            // Roll back.
            setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: c.active } : x)));
            window.alert(res.error || "Failed to update coupon");
        }
    };

    const handleSubmit = async (values: CouponFormValues) => {
        setSubmitting(true);
        setFormError(null);

        const code = values.code.trim().toUpperCase();
        const amount = Number(values.amount);
        const usageLimit = values.usageLimit === "" ? 0 : Number(values.usageLimit);
        const minOrderAmount =
            values.minOrderAmount === "" ? undefined : Number(values.minOrderAmount);
        const expiresAt =
            values.expiresAt === ""
                ? undefined
                : new Date(`${values.expiresAt}T23:59:59.999Z`).toISOString();

        if (!code || code.length < 2) {
            setFormError("Code is required (min 2 characters)");
            setSubmitting(false);
            return;
        }
        if (!Number.isFinite(amount) || amount < 0) {
            setFormError("Amount must be a non-negative number");
            setSubmitting(false);
            return;
        }
        if (values.type === "percent" && amount > 100) {
            setFormError("Percent discount cannot exceed 100");
            setSubmitting(false);
            return;
        }

        const payload = {
            code,
            description: values.description.trim() || undefined,
            type: values.type,
            amount,
            usageLimit,
            minOrderAmount,
            active: values.active,
            expiresAt,
        };

        const url = editing ? `/api/admin/coupons/${editing.id}` : "/api/admin/coupons";
        const res = editing ? await api.patch(url, payload) : await api.post(url, payload);

        if (res.ok) {
            setDialogOpen(false);
            setEditing(null);
            await fetchCoupons();
        } else {
            // Try to surface a useful message.
            const msg =
                (res.data as { message?: string } | null)?.message ||
                res.error ||
                "Failed to save coupon";
            setFormError(msg);
        }
        setSubmitting(false);
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const showingFrom = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const showingTo = Math.min(safePage * PAGE_SIZE, total);

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
            <AdminSidebar />

            <main className="flex-1 p-6 min-w-0">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Ticket className="h-5 w-5" />
                            Coupons
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {loading
                                ? "Loading…"
                                : `${total} coupon${total === 1 ? "" : "s"}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-nowrap">
                        <div className="relative w-48">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by code…"
                                className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                        </div>
                        {canManage && (
                            <Button
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={openCreate}
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                New Coupon
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
                                        Code
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Discount
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Usage
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Min Order
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Active
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Expires
                                    </th>
                                    {canManage && (
                                        <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700 w-24">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {!loading && coupons.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={canManage ? 7 : 6}
                                            className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                                        >
                                            No coupons found.
                                        </td>
                                    </tr>
                                )}
                                {coupons.map((c) => (
                                    <tr
                                        key={c.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    >
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                            <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                {c.code}
                                            </div>
                                            {c.description && (
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                                    {c.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                            {c.type === "percent"
                                                ? `${c.amount}%`
                                                : `₹${c.amount}`}
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {c.usedCount} /{" "}
                                            {c.usageLimit === 0 ? "∞" : c.usageLimit}
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {c.minOrderAmount !== null
                                                ? `₹${c.minOrderAmount}`
                                                : "—"}
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                            <Switch
                                                checked={c.active}
                                                onCheckedChange={() => void handleToggleActive(c)}
                                                disabled={!canManage}
                                                aria-label={`Toggle ${c.code} active`}
                                            />
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {formatDate(c.expiresAt)}
                                        </td>
                                        {canManage && (
                                            <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => openEdit(c)}
                                                        aria-label={`Edit ${c.code}`}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                        onClick={() => void handleDelete(c)}
                                                        aria-label={`Delete ${c.code}`}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination footer */}
                    <div
                        className={cn(
                            "flex items-center justify-between gap-3 px-3 py-2 border-t border-slate-200 dark:border-slate-800",
                            "bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-400"
                        )}
                    >
                        <span>
                            {total === 0
                                ? "0 results"
                                : `Showing ${showingFrom}–${showingTo} of ${total}`}
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

            {canManage && (
                <CouponDialog
                    open={dialogOpen}
                    onOpenChange={(o) => {
                        setDialogOpen(o);
                        if (!o) setEditing(null);
                    }}
                    initial={editing}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    error={formError}
                />
            )}
        </div>
    );
}

// ---------- Dialog ----------

function CouponDialog({
    open,
    onOpenChange,
    initial,
    onSubmit,
    submitting,
    error,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initial: Coupon | null;
    onSubmit: (values: CouponFormValues) => void;
    submitting: boolean;
    error: string | null;
}) {
    const [values, setValues] = useState<CouponFormValues>(() => emptyFormValues());

    useEffect(() => {
        if (!open) return;
        if (initial) {
            setValues({
                code: initial.code,
                description: initial.description,
                type: initial.type,
                amount: String(initial.amount),
                usageLimit: String(initial.usageLimit),
                minOrderAmount:
                    initial.minOrderAmount !== null ? String(initial.minOrderAmount) : "",
                active: initial.active,
                expiresAt: initial.expiresAt ? toDateInputValue(initial.expiresAt) : "",
            });
        } else {
            setValues(emptyFormValues());
        }
    }, [open, initial]);

    const set = <K extends keyof CouponFormValues>(k: K, v: CouponFormValues[K]) =>
        setValues((prev) => ({ ...prev, [k]: v }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{initial ? "Edit Coupon" : "New Coupon"}</DialogTitle>
                    <DialogDescription>
                        {initial
                            ? `Update the details of "${initial.code}".`
                            : "Create a new coupon code users can apply at checkout."}
                    </DialogDescription>
                </DialogHeader>

                <form
                    className="space-y-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit(values);
                    }}
                >
                    <div className="space-y-1">
                        <Label htmlFor="code">Code</Label>
                        <Input
                            id="code"
                            value={values.code}
                            onChange={(e) => set("code", e.target.value)}
                            onBlur={(e) => set("code", e.target.value.toUpperCase())}
                            placeholder="e.g. WELCOME10"
                            className="font-mono"
                            autoComplete="off"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={values.description}
                            onChange={(e) => set("description", e.target.value)}
                            placeholder="Optional. Shown to admins only."
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Type</Label>
                            <div className="flex h-9 items-center gap-3 px-1">
                                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        checked={values.type === "percent"}
                                        onChange={() => set("type", "percent")}
                                        className="accent-amber-500"
                                    />
                                    Percent (%)
                                </label>
                                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        checked={values.type === "flat"}
                                        onChange={() => set("type", "flat")}
                                        className="accent-amber-500"
                                    />
                                    Flat (₹)
                                </label>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                min={0}
                                max={values.type === "percent" ? 100 : undefined}
                                value={values.amount}
                                onChange={(e) => set("amount", e.target.value)}
                                placeholder={values.type === "percent" ? "10" : "50"}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="usageLimit">Usage limit</Label>
                            <Input
                                id="usageLimit"
                                type="number"
                                min={0}
                                value={values.usageLimit}
                                onChange={(e) => set("usageLimit", e.target.value)}
                                placeholder="0 = unlimited"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="minOrderAmount">Min order (₹)</Label>
                            <Input
                                id="minOrderAmount"
                                type="number"
                                min={0}
                                value={values.minOrderAmount}
                                onChange={(e) => set("minOrderAmount", e.target.value)}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="expiresAt">Expires on</Label>
                        <Input
                            id="expiresAt"
                            type="date"
                            value={values.expiresAt}
                            onChange={(e) => set("expiresAt", e.target.value)}
                        />
                    </div>

                    <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Active
                        </span>
                        <Switch
                            checked={values.active}
                            onCheckedChange={(v) => set("active", v)}
                        />
                    </label>

                    {error && (
                        <div className="px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Saving…" : initial ? "Save changes" : "Create coupon"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function emptyFormValues(): CouponFormValues {
    return {
        code: "",
        description: "",
        type: "percent",
        amount: "",
        usageLimit: "0",
        minOrderAmount: "",
        active: true,
        expiresAt: "",
    };
}

// ---------- helpers ----------

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function toDateInputValue(iso: string): string {
    // yyyy-mm-dd for <input type="date">
    return new Date(iso).toISOString().slice(0, 10);
}