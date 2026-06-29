---
title: AI Chatbot + Admin Pages (Context, Leads, Tickets)
date: 2026-06-29
status: draft
---

# AI Chatbot System — Design Spec

## Overview
Main website par floating WhatsApp-style chatbot. Users apna naam + number daalkar chat shuru karte hain. OpenAI API se answers aate hain — precise aur humble. Admin panel mein 3 pages hain: AI Context, AI Leads, AI Tickets.

## Architecture

```
User → Floating Chat Bubble → Name/Phone Form → Chat Window
                                                      |
                                            OpenAI API ← AiContext (context text)
                                                      |
                                              MongoDB (AiLead model)
                                                      |
                                        (if question can't be answered)
                                                      |
                                               AiTicket created
                                                      |
                                          Admin resolves ticket
```

- **Stack:** Next.js 14.2 API routes, Mongoose models, OpenAI API (direct fetch, no package).
- **Auth:** Admin pages protected via existing JWT session middleware.

## MongoDB Models

### AiContext
| Field | Type | Description |
|-------|------|-------------|
| title | string | Section title (e.g. "Company Policies") |
| content | string | Context text fed to AI |
| isActive | boolean | Whether this context is used |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

### AiLead
| Field | Type | Description |
|-------|------|-------------|
| name | string | User's name |
| phone | string | User's phone number |
| conversation | array | `{ role: "user"|"ai", message: string, timestamp: Date }` |
| status | string | `"active" | "resolved" | "escalated"` |
| ticketId | ObjectId? | Reference to AiTicket if escalated |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

### AiTicket
| Field | Type | Description |
|-------|------|-------------|
| leadId | ObjectId? | Reference to AiLead |
| name | string | User's name |
| phone | string | User's phone number |
| issue | string | AI's summary of unresolved issue |
| status | string | `"open" | "resolved"` |
| resolvedAt | Date? | When resolved |
| resolvedBy | string? | Admin who resolved |
| createdAt | Date | Auto |

## Admin Pages

### 1. AI Context (`/admin/ai-context`)
- Table listing all context entries
- Add/Edit modal: title + content (textarea) + active toggle
- Delete with confirmation
- Follows existing admin table patterns (shadcn + server actions)

### 2. AI Leads (`/admin/ai-leads`)
- Table: name, phone, status (badge), last message date
- Click row → expand conversation history (chat bubble UI inside modal)
- Filter by status: All / Active / Resolved / Escalated
- Search by name/phone

### 3. AI Tickets (`/admin/ai-tickets`)
- Table: name, phone, issue summary, status badge, created date
- "Resolved" button → marks ticket resolved, updates lead
- Open ticket count badge in sidebar
- Filter by status (Open / Resolved)

## Chatbot Frontend (ChatWidget)

### Floating Bubble
- Bottom-right corner, fixed position
- WhatsApp-style green bubble icon
- Pulse animation on first load

### Name/Phone Form
- Clean modal/bottom sheet
- Two fields: name + phone (Indian mobile number validation)
- Submit button → opens chat

### Chat Window
- WhatsApp-like UI: green bubbles for AI, gray for user
- Typing indicator ("AI is thinking...") with animated dots
- Timestamps, smooth scroll animations
- Dark overlay / backdrop
- Mobile responsive (full screen on mobile)

## API Routes

### `POST /api/chat/send`
- Body: `{ leadId?, name, phone, message }`
- New lead → create AiLead. Existing → append message
- Call OpenAI API with system prompt = AiContext entries
- If AI can't answer → create AiTicket (status = escalated)
- Return: `{ reply: string, leadId: string, ticketCreated: boolean }`

### `GET /api/admin/ai-context`
- Returns all AiContext entries (admin only)

### `POST /api/admin/ai-context`
- Create AiContext entry

### `PUT /api/admin/ai-context/:id`
- Update AiContext entry

### `DELETE /api/admin/ai-context/:id`
- Delete AiContext entry

### `GET /api/admin/ai-leads`
- Paginated list with search + status filter

### `GET /api/admin/ai-leads/:id`
- Single lead with full conversation

### `GET /api/admin/ai-tickets`
- Paginated list with status filter

### `PUT /api/admin/ai-tickets/:id/resolve`
- Mark ticket as resolved

## OpenAI Integration
- Direct `fetch("https://api.openai.com/v1/chat/completions")`
- System prompt = "You are a helpful assistant for BRPL. Be precise and humble. Answer based on the context provided. If you cannot answer a user's question, say that you need to escalate to a support agent."
- Append active AiContext entries as part of system message
- Temperature: 0.3 (precise, not creative)
- Max tokens: 500

## Chatbot Component Tree
```
ChatWidget (client component)
  ├── FloatingBubble (always visible)
  └── ChatModal (open state)
       ├── NamePhoneForm (if not registered)
       └── ChatWindow (if registered)
            ├── MessageList
            │    └── MessageBubble (user / ai)
            ├── TypingIndicator
            └── MessageInput
```

## Sidebar Navigation
Add to `NAV_ITEMS` in AdminSidebar:
- "AI Context" (Brain icon)
- "AI Leads" (Users icon)  
- "AI Tickets" (TicketCheck icon)
