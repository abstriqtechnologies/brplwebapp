import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AiContext from "@/models/AiContext";
import AiLead from "@/models/AiLead";
import AiTicket from "@/models/AiTicket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, message, leadId } = body;

    if (!name || !phone || !message) {
      return NextResponse.json(
        { error: "Missing required fields", reply: null },
        { status: 400 }
      );
    }

    await connectDB();

    // Find existing lead by leadId, then by phone, else create
    let lead = null;
    if (leadId) {
      lead = await AiLead.findById(leadId);
    }
    if (!lead) {
      lead = await AiLead.findOne({ phone });
    }
    if (!lead) {
      lead = new AiLead({ name, phone, conversation: [], status: "active" });
    } else if (lead.name !== name) {
      lead.name = name;
    }

    // Push user message
    lead.conversation.push({ role: "user", message, timestamp: new Date() });

    // Build context from active AiContext entries
    const contexts = await AiContext.find({ isActive: true }).lean();
    const contextText = contexts
      .map((c: any) => c.content)
      .filter(Boolean)
      .join("\n\n");

    // Detect simple greeting so we don't escalate
    const lowerMsg = message.trim().toLowerCase();
    const isGreeting = /^(hi|hello|hey|hii|hola|namaste|namaskar|good\s+(morning|afternoon|evening))[\s!.,]*$/i.test(
      lowerMsg
    );

    const systemPrompt = `You are a helpful assistant for Brpl. Be precise and humble. Answer based on the context provided. If you cannot answer, reply with: "I don't have that information. Let me connect you with a support agent."

For simple greetings like "hi", "hello", "hey", just greet back warmly without escalation.

Context:
${contextText || "No context configured yet."}`;

    const conversationHistory = lead.conversation.map((m: any) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.message,
    }));

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
        max_tokens: 400,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("[chat/send] OpenAI error:", errText);
      return NextResponse.json(
        { error: "AI service unavailable", reply: null },
        { status: 502 }
      );
    }

    const openaiData = await openaiRes.json();
    const aiReply: string = openaiData?.choices?.[0]?.message?.content?.trim() || "";

    // Push AI reply
    lead.conversation.push({ role: "ai", message: aiReply, timestamp: new Date() });

    let ticketCreated = false;

    // Only escalate when AI says so AND it's not a simple greeting
    const looksLikeEscalation =
      aiReply.toLowerCase().includes("support agent") ||
      aiReply.toLowerCase().includes("i don't have that information") ||
      aiReply.toLowerCase().includes("i'm sorry, i don't have");

    if (looksLikeEscalation && !isGreeting) {
      lead.status = "escalated";
      const ticket = await AiTicket.create({
        leadId: lead._id,
        name: lead.name,
        phone: lead.phone,
        issue: message,
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
  } catch (err) {
    console.error("[chat/send] Unexpected error:", err);
    return NextResponse.json(
      { error: "Server error", reply: null },
      { status: 500 }
    );
  }
}