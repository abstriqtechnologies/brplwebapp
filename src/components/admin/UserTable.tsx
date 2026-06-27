"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ChevronLeft, ChevronRight, CreditCard, Loader2, Edit, Mail, Download } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadUserInvoice, updateUserPayment, sendThankYouEmail } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";
import { downloadBlob, formatCurrencyINR } from "@/utils/adminExport";
import { formatDate } from "@/utils/adminDate";

export interface AdminUserRow {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    paymentStatus?: "pending" | "completed";
    paymentId?: string;
    amount?: number;
    isPaid?: boolean;
    createdAt: string;
    videoCount?: number;
}

interface UserTableProps {
    users: AdminUserRow[];
    isLoading: boolean;
    type: "users";
    page: number;
    totalPages: number;
    totalRecords?: number;
    onPageChange: (page: number) => void;
    onRefresh?: () => void;
}

export function UserTable({
    users,
    isLoading,
    page,
    totalPages,
    totalRecords,
    onPageChange,
    onRefresh,
}: UserTableProps) {
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selected, setSelected] = useState<AdminUserRow | null>(null);
    const [txn, setTxn] = useState("");
    const [amount, setAmount] = useState("1499");
    const [busy, setBusy] = useState(false);
    const [emailingId, setEmailingId] = useState<string | null>(null);

    const openMarkPaid = (u: AdminUserRow) => {
        setSelected(u);
        setTxn("");
        setAmount("1499");
        setPaymentOpen(true);
    };

    const openEdit = (u: AdminUserRow) => {
        setSelected(u);
        setTxn(u.paymentId || "");
        setAmount(String(u.amount ?? 1499));
        setEditOpen(true);
    };

    const submitMarkPaid = async () => {
        if (!selected) return;
        if (!txn) {
            toast({ variant: "destructive", title: "Error", description: "Transaction ID required" });
            return;
        }
        setBusy(true);
        try {
            const res = await updateUserPayment(selected._id, txn, Number(amount));
            if (res.ok) {
                toast({ title: "Success", description: "User marked as paid." });
                setPaymentOpen(false);
                onRefresh?.();
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to update" });
        } finally {
            setBusy(false);
        }
    };

    const submitEdit = async () => {
        if (!selected) return;
        if (!txn) {
            toast({ variant: "destructive", title: "Error", description: "Transaction ID required" });
            return;
        }
        setBusy(true);
        try {
            const res = await updateUserPayment(selected._id, txn, Number(amount));
            if (res.ok) {
                toast({ title: "Success", description: "Transaction ID updated." });
                setEditOpen(false);
                onRefresh?.();
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to update" });
        } finally {
            setBusy(false);
        }
    };

    const handleDownloadInvoice = async (u: AdminUserRow) => {
        try {
            const blob = await downloadUserInvoice(u._id);
            downloadBlob(blob, `Invoice-${(u.name || "user").replace(/\s+/g, "_")}.pdf`);
            toast({ title: "Success", description: "Invoice downloaded" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Download failed" });
        }
    };

    const handleSendEmail = async (u: AdminUserRow) => {
        setEmailingId(u._id);
        try {
            const res = await sendThankYouEmail(u._id);
            if (res.ok && res.data?.sent) {
                toast({ title: "Success", description: `Thank-you email sent to ${u.email}` });
            } else {
                toast({ title: "Skipped", description: res.data?.message || "Email not sent" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed" });
        } finally {
            setEmailingId(null);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading users...</div>;
    }

    if (users.length === 0) {
        return <div className="p-8 text-center text-slate-500">No users found.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-white dark:bg-slate-900 overflow-x-auto">
                <Table className="min-w-[900px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => {
                            const isPaid = u.paymentStatus === "completed";
                            return (
                                <TableRow key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <TableCell className="font-medium whitespace-nowrap">{u.name || "-"}</TableCell>
                                    <TableCell className="whitespace-nowrap">{u.phone || "-"}</TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <Badge variant="outline" className="capitalize">{u.role || "player"}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={
                                                isPaid
                                                    ? "bg-green-500 hover:bg-green-600"
                                                    : "bg-orange-500 hover:bg-orange-600 text-white"
                                            }
                                        >
                                            {isPaid ? "Active" : "Unpaid"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {isPaid ? (
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-green-600">
                                                    {formatCurrencyINR(u.amount ?? 0)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-blue-600"
                                                    onClick={() => handleDownloadInvoice(u)}
                                                    title="Download Invoice"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-sm">Unpaid</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm whitespace-nowrap">{formatDate(u.createdAt)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {!isPaid && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 border-green-500 text-green-600 hover:bg-green-50"
                                                    onClick={() => openMarkPaid(u)}
                                                    title="Mark as Paid"
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <Link href={`/admin/users/${u._id}`} title="View User">
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </Button>
                                            {isPaid && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600"
                                                        onClick={() => openEdit(u)}
                                                        title="Edit Payment"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-green-600"
                                                        onClick={() => handleSendEmail(u)}
                                                        disabled={emailingId === u._id}
                                                        title="Send thank-you email"
                                                    >
                                                        {emailingId === u._id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Mail className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between text-sm">
                <div className="text-slate-500">
                    {totalRecords !== undefined ? `${totalRecords} records` : `Page ${page} of ${totalPages}`}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
                        <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <span className="text-slate-500">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
                        Next <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Mark User as Paid</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>User</Label>
                            <Input value={`${selected?.name || ""} (${selected?.email || ""})`} disabled className="bg-slate-100 dark:bg-slate-800" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="txn">Transaction / Payment ID</Label>
                            <Input id="txn" value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="pay_..." />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="amt">Amount (Rs.)</Label>
                            <Input id="amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
                        <Button onClick={submitMarkPaid} disabled={busy} className="bg-green-600 hover:bg-green-700">
                            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Mark as Paid
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Payment Details</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>User</Label>
                            <Input value={`${selected?.name || ""} (${selected?.email || ""})`} disabled className="bg-slate-100 dark:bg-slate-800" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="amt2">Amount (Rs.)</Label>
                            <Input id="amt2" type="number" value={amount} disabled className="bg-slate-100 dark:bg-slate-800" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="txn2">Transaction / Payment ID</Label>
                            <Input id="txn2" value={txn} onChange={(e) => setTxn(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={submitEdit} disabled={busy} className="bg-blue-600 hover:bg-blue-700">
                            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Details
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
