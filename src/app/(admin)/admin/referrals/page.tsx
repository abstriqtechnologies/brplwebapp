"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Link2,
    Loader2,
    Pencil,
    Plus,
    Search,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/apihelper/api";
import { cn } from "@/lib/utils";

type DiscountType = "flat" | "percent";

type Referral = {
    id: string;
    name: string;
    phone: string;
    code: string;
    couponCode: string;
    type: DiscountType;
    amount: number;
    usageLimit: number;
    active: boolean;
    expiresAt: string | null;
    linkOpenCount: number;
    lastOpenedAt: string | null;
    registrations: number;
    revenue: number;
    createdAt: string;
};

type ReferralFormValues = {
    name: string;
    phone: string;
    code: string;
    type: DiscountType;
    amount: string;
    usageLimit: string;
    active: boolean;
    expiresAt: string;
};

const PAGE_SIZE = 15;

export default function AdminReferralsPage() {
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [page, setPage] = useState(1);
    const [origin, setOrigin] = useState("");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Referral | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [downloadingQrId, setDownloadingQrId] = useState<string | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    useEffect(() => {
        return () => {
            if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQuery(query), 250);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    useEffect(() => {
        setPage(1);
    }, [debouncedQuery]);

    const fetchReferrals = useCallback(
        async (opts: { silent?: boolean } = {}) => {
            if (!opts.silent) {
                setLoading(true);
                setError(null);
            }

            const qs = new URLSearchParams({
                page: String(page),
                pageSize: String(PAGE_SIZE),
            });
            if (debouncedQuery) qs.set("search", debouncedQuery);

            const res = await api.get<{
                ok: true;
                data: { referrals: Referral[]; total: number };
            }>(`/api/admin/referrals?${qs.toString()}`);

            if (res.ok && res.data?.data) {
                setReferrals(res.data.data.referrals);
                setTotal(res.data.data.total);
            } else if (!opts.silent) {
                setError(res.error || "Failed to load referrals");
            }
            if (!opts.silent) setLoading(false);
        },
        [page, debouncedQuery],
    );

    useEffect(() => {
        void fetchReferrals();
    }, [fetchReferrals]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            void fetchReferrals({ silent: true });
        }, 15_000);
        return () => window.clearInterval(timer);
    }, [fetchReferrals]);

    const referralUrl = (code: string) => `${origin || ""}/referral/${encodeURIComponent(code)}`;

    const copyLink = async (ref: Referral) => {
        try {
            await navigator.clipboard.writeText(referralUrl(ref.code));
            setCopiedId(ref.id);
            if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
            copiedTimerRef.current = setTimeout(() => setCopiedId(null), 1800);
        } catch {
            window.alert("Could not copy referral link");
        }
    };

    const downloadQr = async (ref: Referral) => {
        setDownloadingQrId(ref.id);
        try {
            const canvas = document.createElement("canvas");
            const size = 1024;
            canvas.width = size;
            canvas.height = size;

            await QRCode.toCanvas(canvas, referralUrl(ref.code), {
                errorCorrectionLevel: "H",
                margin: 2,
                width: size,
                color: {
                    dark: "#0f172a",
                    light: "#ffffff",
                },
            });

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not prepare QR");

            ctx.save();
            const qrBorderWidth = Math.round(size * 0.018);
            ctx.lineWidth = qrBorderWidth;
            ctx.strokeStyle = "#0f172a";
            ctx.strokeRect(qrBorderWidth / 2, qrBorderWidth / 2, size - qrBorderWidth, size - qrBorderWidth);
            ctx.restore();

            const logo = await loadImage("/logo.webp");
            const badgeSize = Math.round(size * 0.24);
            const badgeX = Math.round((size - badgeSize) / 2);
            const badgeY = Math.round((size - badgeSize) / 2);
            const radius = Math.round(badgeSize * 0.18);

            ctx.save();
            roundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, radius);
            ctx.fillStyle = "#050505";
            ctx.fill();
            ctx.lineWidth = Math.round(size * 0.012);
            ctx.strokeStyle = "#f59e0b";
            ctx.stroke();
            ctx.clip();

            const logoPadding = Math.round(badgeSize * 0.14);
            const logoBox = badgeSize - logoPadding * 2;
            const draw = containRect(
                logo.width,
                logo.height,
                badgeX + logoPadding,
                badgeY + logoPadding,
                logoBox,
                logoBox,
            );
            ctx.drawImage(logo, draw.x, draw.y, draw.width, draw.height);
            ctx.restore();

            const link = document.createElement("a");
            link.download = `Brpl-Referral-QR-${safeFileName(ref.code)}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch {
            window.alert("Could not download referral QR");
        } finally {
            setDownloadingQrId(null);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setFormError(null);
        setDialogOpen(true);
    };

    const openEdit = (ref: Referral) => {
        setEditing(ref);
        setFormError(null);
        setDialogOpen(true);
    };

    const handleToggleActive = async (ref: Referral) => {
        const next = !ref.active;
        setReferrals((prev) => prev.map((item) => (item.id === ref.id ? { ...item, active: next } : item)));
        const res = await api.patch(`/api/admin/referrals/${ref.id}`, { active: next });
        if (!res.ok) {
            setReferrals((prev) => prev.map((item) => (item.id === ref.id ? { ...item, active: ref.active } : item)));
            window.alert(res.error || "Failed to update referral");
        }
    };

    const handleDelete = async (ref: Referral) => {
        const confirmed = window.confirm(`Retire referral "${ref.code}"? The link will stop giving discounts.`);
        if (!confirmed) return;

        const res = await api.delete(`/api/admin/referrals/${ref.id}`);
        if (res.ok) {
            if (referrals.length === 1 && page > 1) setPage(page - 1);
            else void fetchReferrals();
        } else {
            window.alert(res.error || "Failed to retire referral");
        }
    };

    const handleSubmit = async (values: ReferralFormValues) => {
        setSubmitting(true);
        setFormError(null);

        const amount = Number(values.amount);
        const usageLimit = values.usageLimit === "" ? 0 : Number(values.usageLimit);
        const expiresAt =
            values.expiresAt === "" ? undefined : new Date(`${values.expiresAt}T23:59:59.999Z`).toISOString();

        if (!values.name.trim()) {
            setFormError("Name is required");
            setSubmitting(false);
            return;
        }
        if (!values.phone.trim()) {
            setFormError("Phone number is required");
            setSubmitting(false);
            return;
        }
        if (!Number.isFinite(amount) || amount < 0) {
            setFormError("Discount amount must be a non-negative number");
            setSubmitting(false);
            return;
        }
        if (values.type === "percent" && amount > 100) {
            setFormError("Percent discount cannot exceed 100");
            setSubmitting(false);
            return;
        }

        const payload = {
            name: values.name.trim(),
            phone: values.phone.trim(),
            ...(editing ? {} : { code: values.code.trim() || undefined }),
            type: values.type,
            amount,
            usageLimit,
            active: values.active,
            expiresAt,
        };

        const res = editing
            ? await api.patch(`/api/admin/referrals/${editing.id}`, payload)
            : await api.post("/api/admin/referrals", payload);

        if (res.ok) {
            setDialogOpen(false);
            setEditing(null);
            await fetchReferrals();
        } else {
            setFormError((res.data as { message?: string } | null)?.message || res.error || "Failed to save referral");
        }
        setSubmitting(false);
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const showingFrom = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const showingTo = Math.min(safePage * PAGE_SIZE, total);

    return (
        <main className="p-6 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Link2 className="h-5 w-5" />
                        Referral
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {loading ? "Loading..." : `${total} referral${total === 1 ? "" : "s"}`}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-nowrap">
                    <div className="relative w-56">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search name, code, phone"
                            className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                    </div>
                    <Button size="sm" className="h-8 px-3 text-xs" onClick={openCreate}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        New Referral
                    </Button>
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
                                    Influencer
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Link
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Discount
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Opens
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Registrations
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Revenue
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                    Active
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700 w-24">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <ReferralTableSkeleton />}
                            {!loading && referrals.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No referrals found.
                                    </td>
                                </tr>
                            )}
                            {referrals.map((ref) => (
                                <tr key={ref.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    {(() => {
                                        const copied = copiedId === ref.id;
                                        return (
                                            <>
                                                <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {ref.name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        {ref.phone}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                            {ref.code}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn(
                                                                "h-7 w-7",
                                                                copied &&
                                                                    "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400",
                                                            )}
                                                            onClick={() => void copyLink(ref)}
                                                            aria-label={`Copy ${ref.code} referral link`}
                                                            title={copied ? "Copied" : "Copy link"}
                                                        >
                                                            {copied ? (
                                                                <Check className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <Copy className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                        <span className="w-12 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                            {copied ? "Copied" : ""}
                                                        </span>
                                                    </div>
                                                    <div className="max-w-[220px] truncate text-[11px] text-slate-500 dark:text-slate-400">
                                                        {referralUrl(ref.code)}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                    {ref.type === "percent" ? `${ref.amount}%` : `₹${ref.amount}`}
                                                    <span className="ml-1 text-[11px] text-slate-400">
                                                        / {ref.usageLimit === 0 ? "∞" : ref.usageLimit}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                    {ref.linkOpenCount}
                                                </td>
                                                <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                    {ref.registrations}
                                                </td>
                                                <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                    {formatMoney(ref.revenue)}
                                                </td>
                                                <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                                    <Switch
                                                        checked={ref.active}
                                                        onCheckedChange={() => void handleToggleActive(ref)}
                                                        aria-label={`Toggle ${ref.code} active`}
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => void downloadQr(ref)}
                                                            disabled={downloadingQrId === ref.id}
                                                            aria-label={`Download ${ref.code} QR`}
                                                            title="Download QR"
                                                        >
                                                            {downloadingQrId === ref.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Download className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => openEdit(ref)}
                                                            aria-label={`Edit ${ref.code}`}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                            onClick={() => void handleDelete(ref)}
                                                            aria-label={`Retire ${ref.code}`}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </>
                                        );
                                    })()}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div
                    className={cn(
                        "flex items-center justify-between gap-3 px-3 py-2 border-t border-slate-200 dark:border-slate-800",
                        "bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-400",
                    )}
                >
                    <span>{total === 0 ? "0 results" : `Showing ${showingFrom}-${showingTo} of ${total}`}</span>
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

            <ReferralDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setEditing(null);
                }}
                initial={editing}
                onSubmit={handleSubmit}
                submitting={submitting}
                error={formError}
            />
        </main>
    );
}

function ReferralDialog({
    open,
    onOpenChange,
    initial,
    onSubmit,
    submitting,
    error,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initial: Referral | null;
    onSubmit: (values: ReferralFormValues) => void;
    submitting: boolean;
    error: string | null;
}) {
    const [values, setValues] = useState<ReferralFormValues>(() => emptyFormValues());

    useEffect(() => {
        if (!open) return;
        if (initial) {
            setValues({
                name: initial.name,
                phone: initial.phone,
                code: initial.code,
                type: initial.type,
                amount: String(initial.amount),
                usageLimit: String(initial.usageLimit),
                active: initial.active,
                expiresAt: initial.expiresAt ? toDateInputValue(initial.expiresAt) : "",
            });
        } else {
            setValues(emptyFormValues());
        }
    }, [open, initial]);

    const set = <K extends keyof ReferralFormValues>(key: K, value: ReferralFormValues[K]) =>
        setValues((prev) => ({ ...prev, [key]: value }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{initial ? "Edit Referral" : "New Referral"}</DialogTitle>
                </DialogHeader>

                <form
                    className="space-y-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit(values);
                    }}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="referralName">Name</Label>
                            <Input
                                id="referralName"
                                value={values.name}
                                onChange={(event) => set("name", event.target.value)}
                                placeholder="Influencer name"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="referralPhone">Number</Label>
                            <Input
                                id="referralPhone"
                                value={values.phone}
                                onChange={(event) => set("phone", event.target.value)}
                                placeholder="Mobile number"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="referralCode">Link code</Label>
                        <Input
                            id="referralCode"
                            value={values.code}
                            onChange={(event) => set("code", event.target.value.toUpperCase())}
                            placeholder="Auto-generated if blank"
                            className="font-mono"
                            disabled={!!initial}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Type</Label>
                            <div className="flex h-9 items-center gap-3 px-1">
                                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="referralType"
                                        checked={values.type === "percent"}
                                        onChange={() => set("type", "percent")}
                                        className="accent-amber-500"
                                    />
                                    Percent
                                </label>
                                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="referralType"
                                        checked={values.type === "flat"}
                                        onChange={() => set("type", "flat")}
                                        className="accent-amber-500"
                                    />
                                    Flat
                                </label>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="referralAmount">Amount</Label>
                            <Input
                                id="referralAmount"
                                type="number"
                                min={0}
                                max={values.type === "percent" ? 100 : undefined}
                                value={values.amount}
                                onChange={(event) => set("amount", event.target.value)}
                                placeholder={values.type === "percent" ? "10" : "100"}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="referralUsageLimit">Usage limit</Label>
                            <Input
                                id="referralUsageLimit"
                                type="number"
                                min={0}
                                value={values.usageLimit}
                                onChange={(event) => set("usageLimit", event.target.value)}
                                placeholder="0 = unlimited"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="referralExpiresAt">Expires on</Label>
                            <Input
                                id="referralExpiresAt"
                                type="date"
                                value={values.expiresAt}
                                onChange={(event) => set("expiresAt", event.target.value)}
                            />
                        </div>
                    </div>

                    <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Active</span>
                        <Switch checked={values.active} onCheckedChange={(checked) => set("active", checked)} />
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
                            {submitting ? "Saving..." : initial ? "Save changes" : "Create referral"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function emptyFormValues(): ReferralFormValues {
    return {
        name: "",
        phone: "",
        code: "",
        type: "percent",
        amount: "",
        usageLimit: "0",
        active: true,
        expiresAt: "",
    };
}

function formatMoney(value: number): string {
    return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = src;
    });
}

function roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function containRect(
    sourceWidth: number,
    sourceHeight: number,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number,
) {
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    return {
        x: x + (maxWidth - width) / 2,
        y: y + (maxHeight - height) / 2,
        width,
        height,
    };
}

function safeFileName(value: string): string {
    return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "referral";
}

function toDateInputValue(iso: string): string {
    return new Date(iso).toISOString().slice(0, 10);
}

function ReferralTableSkeleton() {
    return (
        <>
            {Array.from({ length: 10 }).map((_, row) => (
                <tr key={row}>
                    {Array.from({ length: 8 }).map((__, col) => (
                        <td key={col} className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="h-4 w-full max-w-24 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}
