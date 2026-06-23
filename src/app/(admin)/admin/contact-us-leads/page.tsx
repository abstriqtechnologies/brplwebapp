"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Loader2, Eye } from "lucide-react";
import { getContactLeads, updateContactLead } from "@/apihelper/admin";
import { formatDate } from "@/utils/adminDate";
import { toast } from "@/components/ui/use-toast";

const STATUS_COLOR: Record<string, string> = {
    new: "bg-blue-500",
    read: "bg-slate-500",
    replied: "bg-green-500",
    archived: "bg-slate-700",
};

export default function ContactLeadsPage() {
    const [items, setItems] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<any | null>(null);
    const [notes, setNotes] = useState("");
    const [newStatus, setNewStatus] = useState("");
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getContactLeads(page, 50, status);
            if (res.ok && res.data) {
                setItems(res.data.items);
                setPages(res.data.pagination.pages);
                setTotal(res.data.pagination.total);
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to load" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [page, status]);

    const open = (lead: any) => {
        setSelected(lead);
        setNotes(lead.notes || "");
        setNewStatus(lead.status);
    };

    const save = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            const res = await updateContactLead(selected._id, { status: newStatus, notes });
            if (res.ok) {
                toast({ title: "Success", description: "Updated" });
                setSelected(null);
                fetchData();
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed" });
        } finally {
            setSaving(false);
        }
    };

    const filtered = items.filter((l) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (l.name || "").toLowerCase().includes(s) ||
            (l.email || "").toLowerCase().includes(s) ||
            (l.phone || "").toLowerCase().includes(s) ||
            (l.message || "").toLowerCase().includes(s);
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold">Contact Us Leads</h1>
                <p className="text-slate-500 mt-1">All submissions from contact/partner forms.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                <Input
                    placeholder="Search by name, email, phone, message..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1"
                />
                <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
                    <SelectTrigger className="w-full md:w-44">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="read">Read</SelectItem>
                        <SelectItem value="replied">Replied</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No leads found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">View</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((l) => (
                                        <TableRow key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <TableCell className="font-medium">{l.name || "—"}</TableCell>
                                            <TableCell className="text-slate-500">{l.email || "—"}</TableCell>
                                            <TableCell>{l.phone || "—"}</TableCell>
                                            <TableCell><Badge variant="outline" className="capitalize">{l.source}</Badge></TableCell>
                                            <TableCell><Badge className={STATUS_COLOR[l.status] || "bg-slate-500"}>{l.status}</Badge></TableCell>
                                            <TableCell className="text-sm text-slate-500">{formatDate(l.createdAt, true)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="icon" variant="ghost" onClick={() => open(l)}>
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
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
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                    <span className="text-slate-500">Page {page} of {pages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>Next <ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>

            <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selected?.name}</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div><Label className="text-xs">Email</Label><div className="font-medium">{selected.email || "—"}</div></div>
                                <div><Label className="text-xs">Phone</Label><div className="font-medium">{selected.phone || "—"}</div></div>
                                <div><Label className="text-xs">Subject</Label><div className="font-medium">{selected.subject || "—"}</div></div>
                                <div><Label className="text-xs">Source</Label><div className="font-medium capitalize">{selected.source}</div></div>
                                <div><Label className="text-xs">Received</Label><div className="font-medium">{formatDate(selected.createdAt, true)}</div></div>
                            </div>
                            <div>
                                <Label className="text-xs">Message</Label>
                                <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-md whitespace-pre-wrap text-sm">{selected.message}</div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label>Status</Label>
                                    <Select value={newStatus} onValueChange={setNewStatus}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">New</SelectItem>
                                            <SelectItem value="read">Read</SelectItem>
                                            <SelectItem value="replied">Replied</SelectItem>
                                            <SelectItem value="archived">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>Internal notes</Label>
                                <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this lead..." />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                        <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
