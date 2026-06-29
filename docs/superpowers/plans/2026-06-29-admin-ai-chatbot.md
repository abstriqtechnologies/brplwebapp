# AI Chatbot System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a floating WhatsApp-style chatbot with OpenAI integration + 3 admin pages (AI Context, AI Leads, AI Tickets).

**Architecture:** Next.js 14.2 API routes + Mongoose models + OpenAI direct API fetch. ChatWidget as client component on main layout. Admin pages as standard server components with client table components.

**Tech Stack:** Next.js 14.2, React 18, Mongoose, Tailwind CSS, Radix UI/shacdn, OpenAI API

## Global Constraints

- No new npm packages for OpenAI — use direct `fetch("https://api.openai.com/v1/chat/completions")`
- ChatWidget must be a single client component bundle (avoid code splitting issues)
- Admin pages must follow existing patterns (AdminSidebar nav, table UI)
- TypeScript strict mode
- Mobile-responsive UI
- OpenAI temperature: 0.3, max_tokens: 500

---

## File Structure

### New Models
- `src/models/AiContext.ts` — Context entries for AI
- `src/models/AiLead.ts` — Lead + conversation storage
- `src/models/AiTicket.ts` — Ticket for escalation

### New API Routes
- `src/app/api/chat/send/route.ts` — Chat endpoint (no auth)
- `src/app/api/admin/ai-context/route.ts` — List/Create contexts
- `src/app/api/admin/ai-context/[id]/route.ts` — Update/Delete context
- `src/app/api/admin/ai-leads/route.ts` — List leads with search/filter
- `src/app/api/admin/ai-leads/[id]/route.ts` — Get single lead with conversation
- `src/app/api/admin/ai-tickets/route.ts` — List tickets
- `src/app/api/admin/ai-tickets/[id]/resolve/route.ts` — Resolve ticket

### New Admin Pages
- `src/app/(admin)/admin/ai-context/page.tsx` + `AiContextClient.tsx`
- `src/app/(admin)/admin/ai-leads/page.tsx` + `AiLeadsClient.tsx`
- `src/app/(admin)/admin/ai-tickets/page.tsx` + `AiTicketsClient.tsx`

### New Components
- `src/components/chat/ChatWidget.tsx` — Main chatbot widget
- `src/components/chat/NamePhoneForm.tsx` — Name/phone form
- `src/components/chat/ChatWindow.tsx` — Chat interface
- `src/components/chat/MessageBubble.tsx` — Individual message bubble
- `src/components/chat/TypingIndicator.tsx` — "AI is thinking" animation

### Modified Files
- `src/components/admin/AdminSidebar.tsx` — Add AI nav items
- `src/app/layout.tsx` — Add ChatWidget
- `src/app/(admin)/admin/layout.tsx` — Verify layout works

---

### Task 1: Create Mongoose Models (AiContext, AiLead, AiTicket)

**Files:**
- Create: `src/models/AiContext.ts`
- Create: `src/models/AiLead.ts`
- Create: `src/models/AiTicket.ts`

**Interfaces:**
- Produces: `AiContext` model, `AiLead` model, `AiTicket` model — all standard Mongoose models with timestamps

- [ ] **Step 1: Create AiContext model**

```typescript
// src/models/AiContext.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAiContext extends Document {
  title: string;
  content: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AiContextSchema = new Schema<IAiContext>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.AiContext ||
  mongoose.model<IAiContext>("AiContext", AiContextSchema);
```

- [ ] **Step 2: Create AiLead model**

```typescript
// src/models/AiLead.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IConversationMessage {
  role: "user" | "ai";
  message: string;
  timestamp: Date;
}

export interface IAiLead extends Document {
  name: string;
  phone: string;
  conversation: IConversationMessage[];
  status: "active" | "resolved" | "escalated";
  ticketId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationMessageSchema = new Schema<IConversationMessage>(
  {
    role: { type: String, enum: ["user", "ai"], required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AiLeadSchema = new Schema<IAiLead>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    conversation: [ConversationMessageSchema],
    status: {
      type: String,
      enum: ["active", "resolved", "escalated"],
      default: "active",
    },
    ticketId: { type: Schema.Types.ObjectId, ref: "AiTicket" },
  },
  { timestamps: true }
);

AiLeadSchema.index({ phone: 1 });
AiLeadSchema.index({ status: 1 });

export default mongoose.models.AiLead ||
  mongoose.model<IAiLead>("AiLead", AiLeadSchema);
```

- [ ] **Step 3: Create AiTicket model**

```typescript
// src/models/AiTicket.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAiTicket extends Document {
  leadId?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  issue: string;
  status: "open" | "resolved";
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AiTicketSchema = new Schema<IAiTicket>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "AiLead" },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    issue: { type: String, required: true },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
  },
  { timestamps: true }
);

AiTicketSchema.index({ status: 1 });

export default mongoose.models.AiTicket ||
  mongoose.model<IAiTicket>("AiTicket", AiTicketSchema);
```

- [ ] **Step 4: Commit**

```bash
git add src/models/
git commit -m "feat(ai): add AiContext, AiLead, AiTicket models"
```

---

### Task 2: Chat API Route (OpenAI Integration)

**Files:**
- Create: `src/app/api/chat/send/route.ts`

**Interfaces:**
- Consumes: `AiContext`, `AiLead`, `AiTicket` models
- Produces: `POST /api/chat/send` endpoint — body: `{ leadId?, name, phone, message }`, response: `{ reply: string, leadId: string, ticketCreated: boolean }`

- [ ] **Step 1: Create chat send route**

```typescript
// src/app/api/chat/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiContext from "@/models/AiContext";
import AiLead from "@/models/AiLead";
import AiTicket from "@/models/AiTicket";

export async function POST(req: NextRequest) {
  try {
    const { leadId, name, phone, message } = await req.json();

    if (!name || !phone || !message) {
      return NextResponse.json(
        { error: "name, phone, and message are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find or create lead
    let lead;
    if (leadId) {
      lead = await AiLead.findById(leadId);
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
    } else {
      // Check if lead exists by phone
      lead = await AiLead.findOne({ phone });
      if (lead) {
        // Update name if different
        lead.name = name;
      } else {
        lead = new AiLead({ name, phone, conversation: [] });
      }
    }

    // Add user message to conversation
    lead.conversation.push({
      role: "user",
      message,
      timestamp: new Date(),
    });

    // Build system prompt from active context
    const contexts = await AiContext.find({ isActive: true }).lean();
    const contextText = contexts.map((c) => c.content).join("\n\n");

    const systemPrompt = `You are a helpful assistant for BRPL. Be precise and humble. Answer based on the context provided below. If you cannot answer a user's question based on the context, reply with: "I'm sorry, I don't have enough information to answer that. Let me transfer you to a support agent who can help." Do not make up information.

Context:
${contextText || "No specific context provided."}`;

    // Build conversation history for OpenAI
    const conversationHistory = lead.conversation.map((msg: any) => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.message,
    }));

    // Call OpenAI
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return NextResponse.json(
        { error: "AI service error" },
        { status: 500 }
      );
    }

    const aiData = await openaiResponse.json();
    const aiReply = aiData.choices[0]?.message?.content || "";

    // Add AI reply to conversation
    lead.conversation.push({
      role: "ai",
      message: aiReply,
      timestamp: new Date(),
    });

    let ticketCreated = false;

    // Check if AI couldn't answer → create ticket
    if (
      aiReply.includes("I'm sorry, I don't have enough information") ||
      aiReply.includes("transfer you to a support agent")
    ) {
      // Update lead status
      lead.status = "escalated";

      // Create ticket
      const ticket = await AiTicket.create({
        leadId: lead._id,
        name: lead.name,
        phone: lead.phone,
        issue: message, // User's last question as issue
        status: "open",
      });

      lead.ticketId = ticket._id;
      ticketCreated = true;
    }

    await lead.save();

    return NextResponse.json({
      reply: aiReply,
      leadId: lead._id.toString(),
      ticketCreated,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/chat/
git commit -m "feat(ai): add chat send API with OpenAI integration"
```

---

### Task 3: Admin API Routes — AI Context CRUD

**Files:**
- Create: `src/app/api/admin/ai-context/route.ts`
- Create: `src/app/api/admin/ai-context/[id]/route.ts`

**Interfaces:**
- Produces: GET/POST `/api/admin/ai-context`, PUT/DELETE `/api/admin/ai-context/[id]`

- [ ] **Step 1: Create list/create route**

```typescript
// src/app/api/admin/ai-context/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiContext from "@/models/AiContext";

export async function GET() {
  try {
    await connectDB();
    const contexts = await AiContext.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ contexts });
  } catch (error) {
    console.error("Error fetching AI contexts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, content, isActive } = await req.json();
    if (!title || !content) {
      return NextResponse.json(
        { error: "title and content are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const context = await AiContext.create({ title, content, isActive });
    return NextResponse.json({ context }, { status: 201 });
  } catch (error) {
    console.error("Error creating AI context:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create update/delete route**

```typescript
// src/app/api/admin/ai-context/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiContext from "@/models/AiContext";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { title, content, isActive } = await req.json();
    await connectDB();
    const context = await AiContext.findByIdAndUpdate(
      params.id,
      { title, content, isActive },
      { new: true }
    );
    if (!context) {
      return NextResponse.json(
        { error: "Context not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ context });
  } catch (error) {
    console.error("Error updating AI context:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const context = await AiContext.findByIdAndDelete(params.id);
    if (!context) {
      return NextResponse.json(
        { error: "Context not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting AI context:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/ai-context/
git commit -m "feat(ai): add admin API routes for AI context CRUD"
```

---

### Task 4: Admin API Routes — AI Leads + AI Tickets

**Files:**
- Create: `src/app/api/admin/ai-leads/route.ts`
- Create: `src/app/api/admin/ai-leads/[id]/route.ts`
- Create: `src/app/api/admin/ai-tickets/route.ts`
- Create: `src/app/api/admin/ai-tickets/[id]/resolve/route.ts`

**Interfaces:**
- Produces: GET leads (paginated, filterable), GET single lead, GET tickets (paginated, filterable), PUT resolve ticket

- [ ] **Step 1: Create AI leads list route**

```typescript
// src/app/api/admin/ai-leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiLead from "@/models/AiLead";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    await connectDB();

    const filter: any = {};
    if (status && status !== "all") {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const [leads, total] = await Promise.all([
      AiLead.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AiLead.countDocuments(filter),
    ]);

    return NextResponse.json({
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching AI leads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create single lead route**

```typescript
// src/app/api/admin/ai-leads/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiLead from "@/models/AiLead";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const lead = await AiLead.findById(params.id).lean();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create tickets list route**

```typescript
// src/app/api/admin/ai-tickets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiTicket from "@/models/AiTicket";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    await connectDB();

    const filter: any = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const [tickets, total] = await Promise.all([
      AiTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AiTicket.countDocuments(filter),
    ]);

    return NextResponse.json({
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Create ticket resolve route**

```typescript
// src/app/api/admin/ai-tickets/[id]/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiTicket from "@/models/AiTicket";
import AiLead from "@/models/AiLead";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { resolvedBy } = await req.json();
    await connectDB();

    const ticket = await AiTicket.findByIdAndUpdate(
      params.id,
      {
        status: "resolved",
        resolvedAt: new Date(),
        resolvedBy: resolvedBy || "Admin",
      },
      { new: true }
    );

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Also update the associated lead status if exists
    if (ticket.leadId) {
      await AiLead.findByIdAndUpdate(ticket.leadId, { status: "resolved" });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Error resolving ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/ai-leads/ src/app/api/admin/ai-tickets/
git commit -m "feat(ai): add admin API routes for AI leads and tickets"
```

---

### Task 5: Chatbot UI Component (ChatWidget)

**Files:**
- Create: `src/components/chat/ChatWidget.tsx`
- Create: `src/components/chat/NamePhoneForm.tsx`
- Create: `src/components/chat/ChatWindow.tsx`
- Create: `src/components/chat/MessageBubble.tsx`
- Create: `src/components/chat/TypingIndicator.tsx`

**Interfaces:**
- Produces: `<ChatWidget />` component — takes no props, self-contained
- Consumes: `POST /api/chat/send`

- [ ] **Step 1: Create TypingIndicator component**

```tsx
// src/components/chat/TypingIndicator.tsx
"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 mb-3">
      <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
        AI
      </div>
      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create MessageBubble component**

```tsx
// src/components/chat/MessageBubble.tsx
"use client";

interface MessageBubbleProps {
  role: "user" | "ai";
  message: string;
  timestamp: Date;
}

export function MessageBubble({ role, message, timestamp }: MessageBubbleProps) {
  return (
    <div
      className={`flex items-start gap-2.5 mb-3 ${
        role === "user" ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${
          role === "user"
            ? "bg-blue-500"
            : "bg-emerald-600"
        }`}
      >
        {role === "user" ? "U" : "AI"}
      </div>
      <div
        className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed ${
          role === "user"
            ? "bg-emerald-500 text-white rounded-2xl rounded-tr-sm"
            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap">{message}</p>
        <p
          className={`text-[10px] mt-1 ${
            role === "user"
              ? "text-emerald-100"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create NamePhoneForm component**

```tsx
// src/components/chat/NamePhoneForm.tsx
"use client";

import { useState } from "react";

interface NamePhoneFormProps {
  onSubmit: (name: string, phone: string) => void;
}

export function NamePhoneForm({ onSubmit }: NamePhoneFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    setError("");
    onSubmit(name.trim(), phone.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Start a Conversation
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Please enter your details to chat with us
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <button
          type="submit"
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Start Chat
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Create ChatWindow component**

```tsx
// src/components/chat/ChatWindow.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface ChatMessage {
  role: "user" | "ai";
  message: string;
  timestamp: Date;
}

interface ChatWindowProps {
  leadId: string;
  name: string;
  initialConversation?: ChatMessage[];
}

export function ChatWindow({ leadId, name, initialConversation = [] }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialConversation);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      role: "user",
      message: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          name,
          message: userMessage.message,
        }),
      });

      const data = await res.json();

      const aiMessage: ChatMessage = {
        role: "ai",
        message: data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: "ai",
        message: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-emerald-500 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium text-sm">{name}</p>
          <p className="text-emerald-100 text-xs">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-10">
            <p className="mb-1">👋 Hello {name}!</p>
            <p>How can we help you today?</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            message={msg.message}
            timestamp={msg.timestamp}
          />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isTyping}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create main ChatWidget component**

```tsx
// src/components/chat/ChatWidget.tsx
"use client";

import { useState, useCallback } from "react";
import { NamePhoneForm } from "./NamePhoneForm";
import { ChatWindow } from "./ChatWindow";

type ChatState = "closed" | "form" | "chat";

export function ChatWidget() {
  const [state, setState] = useState<ChatState>("closed");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  const handleFormSubmit = useCallback(async (name: string, phone: string) => {
    setUserName(name);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, message: "Hello" }),
      });
      const data = await res.json();
      setLeadId(data.leadId);
      setState("chat");
    } catch {
      // If API fails, still open chat
      setState("chat");
    }
  }, []);

  const openForm = () => setState("form");
  const closeChat = () => setState("closed");

  return (
    <>
      {/* Floating Bubble */}
      {state === "closed" && (
        <button
          onClick={openForm}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center animate-pulse hover:animate-none"
          aria-label="Open chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat Modal */}
      {state !== "closed" && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[600px] max-h-[calc(100vh-100px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-5 fade-in duration-200">
          {/* Close button */}
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={closeChat}
              className="w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {state === "form" && (
            <NamePhoneForm onSubmit={handleFormSubmit} />
          )}

          {state === "chat" && leadId && (
            <ChatWindow leadId={leadId} name={userName} />
          )}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/
git commit -m "feat(ai): add ChatWidget with WhatsApp-style UI"
```

---

### Task 6: Add ChatWidget to Main Layout + Sidebar Nav Items

**Files:**
- Modify: `src/app/layout.tsx` — add `<ChatWidget />`
- Modify: `src/components/admin/AdminSidebar.tsx` — add AI nav items
- Create: `src/app/(admin)/admin/ai-context/page.tsx`
- Create: `src/app/(admin)/admin/ai-leads/page.tsx`
- Create: `src/app/(admin)/admin/ai-tickets/page.tsx`

- [ ] **Step 1: Add ChatWidget to layout.tsx**

Find where `<main>` or the main body content is rendered in `src/app/layout.tsx` and add `<ChatWidget />` before the closing body or main tag. The ChatWidget is a client component so it must be added in a way that works with the server layout.

Look at the existing layout.tsx structure. Add:
```
import { ChatWidget } from "@/components/chat/ChatWidget";
```
and render `<ChatWidget />` in the body.

- [ ] **Step 2: Add admin nav items to AdminSidebar.tsx**

```typescript
// Add these imports
import { Brain, Users, TicketCheck } from "lucide-react";

// Add these items to NAV_ITEMS array (before Legal or at the end)
{ label: "AI Context", href: "/admin/ai-context", icon: Brain },
{ label: "AI Leads", href: "/admin/ai-leads", icon: Users },
{ label: "AI Tickets", href: "/admin/ai-tickets", icon: TicketCheck },
```

- [ ] **Step 3: Create AI Context admin page**

```tsx
// src/app/(admin)/admin/ai-context/page.tsx
export default function AiContextPage() {
  return (
    <div className="p-6">
      <AiContextClient />
    </div>
  );
}
```

Plus create `AiContextClient` component (see Task 7).

- [ ] **Step 4: Create AI Leads admin page**

```tsx
// src/app/(admin)/admin/ai-leads/page.tsx
export default function AiLeadsPage() {
  return (
    <div className="p-6">
      <AiLeadsClient />
    </div>
  );
}
```

- [ ] **Step 5: Create AI Tickets admin page**

```tsx
// src/app/(admin)/admin/ai-tickets/page.tsx
export default function AiTicketsPage() {
  return (
    <div className="p-6">
      <AiTicketsClient />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/components/admin/AdminSidebar.tsx src/app/\(admin\)/admin/ai-*/
git commit -m "feat(ai): add ChatWidget to layout and admin nav items"
```

---

### Task 7: AI Context Admin Page (Client Component)

**Files:**
- Create: `src/components/admin/ai/AiContextClient.tsx`

**Interfaces:**
- Produces: `<AiContextClient />` — full CRUD table for AI context entries
- Consumes: `GET/POST/PUT/DELETE /api/admin/ai-context`

- [ ] **Step 1: Create AiContextClient component**

```tsx
// src/components/admin/ai/AiContextClient.tsx
"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, Search } from "lucide-react";

interface AiContextEntry {
  _id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

export function AiContextClient() {
  const [entries, setEntries] = useState<AiContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AiContextEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-context");
      const data = await res.json();
      setEntries(data.contexts || []);
    } catch (err) {
      console.error("Failed to fetch", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setIsActive(true);
    setShowModal(true);
  };

  const openEdit = (entry: AiContextEntry) => {
    setEditing(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setIsActive(entry.isActive);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      if (editing) {
        await fetch(`/api/admin/ai-context/${editing._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, isActive }),
        });
      } else {
        await fetch("/api/admin/ai-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, isActive }),
        });
      }
      setShowModal(false);
      fetchEntries();
    } catch (err) {
      console.error("Failed to save", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this context?")) return;
    try {
      await fetch(`/api/admin/ai-context/${id}`, { method: "DELETE" });
      fetchEntries();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Context</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage context data that the AI uses to answer user questions
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Context
        </button>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-400 text-sm">No context entries yet. Click "Add Context" to create one.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => (
                <tr key={entry._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {entry.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {entry.content}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {entry.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(entry)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editing ? "Edit Context" : "Add Context"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g. Company Policies, FAQs"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  placeholder="Enter the context text that AI should use..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim() || !content.trim()}
                className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update AiContextPage to import the client component**

Update `src/app/(admin)/admin/ai-context/page.tsx`:
```tsx
import { AiContextClient } from "@/components/admin/ai/AiContextClient";

export default function AiContextPage() {
  return (
    <div className="p-6">
      <AiContextClient />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ai/ src/app/\(admin\)/admin/ai-context/
git commit -m "feat(ai): add AI Context admin page with CRUD"
```

---

### Task 8: AI Leads Admin Page (Client Component)

**Files:**
- Create: `src/components/admin/ai/AiLeadsClient.tsx`

**Interfaces:**
- Produces: `<AiLeadsClient />` — table with search, filter, conversation modal
- Consumes: `GET /api/admin/ai-leads`, `GET /api/admin/ai-leads/[id]`

- [ ] **Step 1: Create AiLeadsClient component**

```tsx
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
```

- [ ] **Step 2: Update AiLeadsPage**

```tsx
// src/app/(admin)/admin/ai-leads/page.tsx
import { AiLeadsClient } from "@/components/admin/ai/AiLeadsClient";

export default function AiLeadsPage() {
  return (
    <div className="p-6">
      <AiLeadsClient />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ai/AiLeadsClient.tsx src/app/\(admin\)/admin/ai-leads/
git commit -m "feat(ai): add AI Leads admin page with conversation viewer"
```

---

### Task 9: AI Tickets Admin Page (Client Component)

**Files:**
- Create: `src/components/admin/ai/AiTicketsClient.tsx`

**Interfaces:**
- Produces: `<AiTicketsClient />` — tickets table with resolve button
- Consumes: `GET /api/admin/ai-tickets`, `PUT /api/admin/ai-tickets/[id]/resolve`

- [ ] **Step 1: Create AiTicketsClient component**

```tsx
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tickets created when AI cannot resolve user queries
          </p>
        </div>
        {openCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            {openCount} Open Ticket{openCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Tickets</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-400 text-sm">No tickets found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Issue</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tickets.map((ticket) => (
                <tr key={ticket._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {ticket.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{ticket.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    {ticket.issue}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ticket.status === "open"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      }`}
                    >
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {ticket.status === "open" ? (
                      <button
                        onClick={() => handleResolve(ticket._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Resolve
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
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
    </div>
  );
}
```

- [ ] **Step 2: Update AiTicketsPage**

```tsx
// src/app/(admin)/admin/ai-tickets/page.tsx
import { AiTicketsClient } from "@/components/admin/ai/AiTicketsClient";

export default function AiTicketsPage() {
  return (
    <div className="p-6">
      <AiTicketsClient />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ai/AiTicketsClient.tsx src/app/\(admin\)/admin/ai-tickets/
git commit -m "feat(ai): add AI Tickets admin page with resolve action"
```

---

### Optional: Fix layout.tsx to add ChatWidget

Note: The layout.tsx is a server component. We need to wrap ChatWidget in a dynamic import or add it to a client wrapper. Check the current layout.tsx structure.

If layout.tsx is a server component, add a client wrapper that includes ChatWidget, or use dynamic import with `ssr: false`.
