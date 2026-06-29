// src/components/admin/ai/AiTicketsClient.tsx
"use client";

import { useState, useEffect } from "react";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface AiTicket {
  _id: string;
  name: string;
  phone: string;
  issue: string;
  status: "open" | "resolved";
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export function AiTicketsClient() {
  const [tickets, setTickets] = useState<AiTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openCount, setOpenCount] = useState(0);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/ai-tickets?${params}`);
      const data = await res.json();
      setTickets(data.tickets || []);
      setTotalPages(data.totalPages || 1);

      // Count open tickets
      const allRes = await fetch("/api/admin/ai-tickets?status=open&limit=1");
      const allData = await allRes.json();
      setOpenCount(allData.total || 0);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter]);

  const handleResolve = async (ticketId: string) => {
    try {
      await fetch(`/api/admin/ai-tickets/${ticketId}/resolve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolvedBy: "Admin" }),
      });
      fetchTickets();
    } catch (err) {
      console.error("Failed to resolve ticket", err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Tickets</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Tickets created when AI cannot resolve user queries
          </p>
        </div>
        {openCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            {openCount} Open
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="mb-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Tickets</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-400">
          No tickets found
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Name</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Phone</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Issue</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Status</th>
                <th className="text-right px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Date</th>
                <th className="text-right px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket._id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                  <td className="px-2 py-1 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 font-medium whitespace-nowrap">
                    {ticket.name}
                  </td>
                  <td className="px-2 py-1 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap font-mono">
                    {ticket.phone}
                  </td>
                  <td className="px-2 py-1 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 max-w-xs truncate">
                    {ticket.issue}
                  </td>
                  <td className="px-2 py-1 text-center text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </td>
                  <td className="px-2 py-1 text-right text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap font-mono">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    {ticket.status === "open" ? (
                      <button
                        onClick={() => handleResolve(ticket._id)}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-gray-400">
                        {ticket.resolvedBy && `by ${ticket.resolvedBy}`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3 text-xs">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
