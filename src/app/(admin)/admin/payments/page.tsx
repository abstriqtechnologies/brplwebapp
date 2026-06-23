"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, IndianRupee } from "lucide-react";
import { getPayments } from "@/apihelper/admin";
import { formatDate } from "@/utils/adminDate";
import { formatCurrencyINR } from "@/utils/adminExport";
import { toast } from "@/components/ui/use-toast";

export default function PaymentsPage() {
    const [items, setItems] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState({ totalAmount: 0, totalCount: 0 });
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getPayments(page, 20, status);
            if (res.ok && res.data) {
                setItems(res.data.items);
                setPages(res.data.pagination.pages);
                setTotal(res.data.pagination.total);
                setSummary(res.data.summary);
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to load payments" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, status]);

    const filtered = items.filter((p) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            (p.paymentId || "").toLowerCase().includes(s) ||
            (p.userId?.name || "").toLowerCase().includes(s) ||
            (p.userId?.email || "").toLowerCase().includes(s) ||
            (p.userId?.phone || "").toLowerCase().includes(s)
        );
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold">Payments</h1>
                <p className="text-slate-500 mt-1">All payment transactions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-500 font-medium">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-blue-700 flex items-center gap-1">
                            <IndianRupee className="w-6 h-6" /> {summary.totalAmount.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-500 font-medium">Total Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-600">{summary.totalCount.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-500 font-medium">Showing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{filtered.length} / {total}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                <Input
                    placeholder="Search by name, email, phone, payment ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1"
                />
                <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
                    <SelectTrigger className="w-full md:w-44">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="created">Created</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No payments found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Payment ID</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((p) => (
                                        <TableRow key={p._id}>
                                            <TableCell className="font-medium">
                                                {p.userId?.name || "—"}
                                                <div className="text-xs text-slate-500">{p.userId?.email || ""}</div>
                                            </TableCell>
                                            <TableCell>{p.userId?.phone || "—"}</TableCell>
                                            <TableCell className="font-mono text-xs">{p.paymentId}</TableCell>
                                            <TableCell className="font-medium text-green-600">{formatCurrencyINR(p.amount)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">{p.source || "razorpay"}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={p.status === "completed" ? "bg-green-500" : p.status === "failed" ? "bg-red-500" : "bg-slate-500"}>
                                                    {p.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500">{formatDate(p.createdAt, true)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-2 text-sm">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-slate-500">Page {page} of {pages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>
                    Next <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}