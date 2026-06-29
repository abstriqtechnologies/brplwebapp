import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { env } from "@/lib/env";
import AiContext from "@/models/AiContext";
import AiLead, { IAiLead } from "@/models/AiLead";
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
    let lead: IAiLead | null = null;
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

    if (!lead) {
      throw new Error("Failed to create or load lead");
    }

    const activeLead: IAiLead = lead;

    // Push user message
    activeLead.conversation.push({ role: "user", message, timestamp: new Date() });

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

    const systemPrompt = `You are a helpful assistant for Brpl. Be precise and humble. Answer based on the context provided. If you cannot answer, reply with: "I have escalated your query to our team — they will get back to you shortly."

For simple greetings like "hi", "hello", "hey", just greet back warmly without escalation.

Context:
${contextText || "No context configured yet."}`;

    const conversationHistory = activeLead.conversation.map((m: any) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.message,
    }));

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
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
    activeLead.conversation.push({ role: "ai", message: aiReply, timestamp: new Date() });

    let ticketCreated = false;

    // Only escalate when AI says so AND it's not a simple greeting
    const looksLikeEscalation =
      aiReply.toLowerCase().includes("support agent") ||
      aiReply.toLowerCase().includes("our agent") ||
      aiReply.toLowerCase().includes("our team") ||
      aiReply.toLowerCase().includes("escalated your query");

    if (looksLikeEscalation && !isGreeting) {
      activeLead.status = "escalated";
      const ticket = await AiTicket.create({
        leadId: activeLead._id,
        name: activeLead.name,
        phone: activeLead.phone,
        issue: message,
        status: "open",
      });
      activeLead.ticketId = ticket._id;
      ticketCreated = true;
    }

    await activeLead.save();

    return NextResponse.json({
      reply: aiReply,
      leadId: activeLead._id.toString(),
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