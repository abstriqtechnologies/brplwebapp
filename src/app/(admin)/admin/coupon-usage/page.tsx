"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { listCouponUsage } from "@/apihelper/admin";
import { formatDate } from "@/utils/adminDate";
import { formatCurrencyINR } from "@/utils/adminExport";
import { toast } from "@/components/ui/use-toast";

export default function CouponUsagePage() {
    const [items, setItems] = useState<any[]>([]);
    const [page, setPages] = useState(1);
    const [pages, setPagesState] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetch = async () => {
        setLoading(true);
        try {
            const res = await listCouponUsage(page, 50);
            if (res.ok && res.data) {
                setItems(res.data.items);
                setPagesState(res.data.pagination.pages);
                setTotal(res.data.pagination.total);
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to load" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetch(); }, [page]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold">Coupon Usage</h1>
                <p className="text-slate-500 mt-1">All redemptions of discount coupons.</p>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No usage yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Discount</TableHead>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Used At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((u) => (
                                        <TableRow key={u._id}>
                                            <TableCell><Badge className="font-mono">{u.code}</Badge></TableCell>
                                            <TableCell>{u.userId?.name || "—"}</TableCell>
                                            <TableCell className="text-slate-500">{u.userId?.email || "—"}</TableCell>
                                            <TableCell className="font-medium text-green-600">{formatCurrencyINR(u.discountApplied)}</TableCell>
                                            <TableCell className="font-mono text-xs">{u.orderId || "—"}</TableCell>
                                            <TableCell className="text-sm text-slate-500">{formatDate(u.usedAt, true)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between text-sm">
                <div className="text-slate-500">{total} records</div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPages((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                    <span className="text-slate-500">Page {page} of {pages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPages((p) => Math.min(pages, p + 1))} disabled={page === pages}>Next <ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
    );
}