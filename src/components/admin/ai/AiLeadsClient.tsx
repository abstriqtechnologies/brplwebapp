// src/components/admin/ai/AiLeadsClient.tsx
"use client";

import { useState, useEffect } from "react";
import { Search, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";

interface ConversationMessage {
  role: "user" | "ai";
  message: string;
  timestamp: string;
}

interface AiLead {
  _id: string;
  name: string;
  phone: string;
  status: "active" | "resolved" | "escalated";
  conversation: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  escalated: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function AiLeadsClient() {
  const [leads, setLeads] = useState<AiLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLead, setSelectedLead] = useState<AiLead | null>(null);
  const [showConversation, setShowConversation] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/ai-leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch leads", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchLeads();
  };

  const openConversation = async (lead: AiLead) => {
    try {
      const res = await fetch(`/api/admin/ai-leads/${lead._id}`);
      const data = await res.json();
      setSelectedLead(data.lead);
      setShowConversation(true);
    } catch (err) {
      console.error("Failed to fetch lead details", err);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Leads</h1>
        <p className="text-sm text-gray-500 mt-1">
          View all users who have interacted with the AI chatbot
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-400 text-sm">No leads found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {leads.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {lead.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{lead.phone}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || ""}`}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500">
                    {new Date(lead.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openConversation(lead)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      View Chat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Conversation Modal */}
      {showConversation && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg mx-4 shadow-xl flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{selectedLead.name}</h3>
                <p className="text-xs text-gray-500">{selectedLead.phone}</p>
              </div>
              <button
                onClick={() => setShowConversation(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedLead.conversation.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No messages yet</p>
              ) : (
                selectedLead.conversation.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                        msg.role === "user"
                          ? "bg-emerald-500 text-white rounded-tr-sm"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-emerald-100" : "text-gray-400"}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
