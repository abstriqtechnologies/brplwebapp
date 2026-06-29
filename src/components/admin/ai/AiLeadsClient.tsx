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
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Leads</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          All users who have interacted with the AI chatbot
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by name or phone..."
          className="flex-1 min-w-[200px] px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:border-emerald-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-400">
          No leads found
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Name</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Phone</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Status</th>
                <th className="text-right px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Last Activity</th>
                <th className="text-right px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead._id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                  <td className="px-2 py-1 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 font-medium whitespace-nowrap">
                    {lead.name}
                  </td>
                  <td className="px-2 py-1 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap font-mono">
                    {lead.phone}
                  </td>
                  <td className="px-2 py-1 text-center text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">
                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                  </td>
                  <td className="px-2 py-1 text-right text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap font-mono">
                    {new Date(lead.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    <button
                      onClick={() => openConversation(lead)}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
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
