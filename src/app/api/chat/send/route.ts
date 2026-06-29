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
    const contextText = contexts.map((c: any) => c.content).join("\n\n");

    const systemPrompt = `You are a helpful assistant for BRPL. Be precise and humble. Answer based on the context provided below. If you cannot answer a user's question based on the context, reply with: "I'm sorry, I don't have enough information to answer that. Let me transfer you to a support agent who can help." Do not make up information.

For simple greetings like "Hi", "Hello", "Hey", or short pleasantries, just respond warmly without invoking the support-agent fallback.

Context:
${contextText || "No specific context provided yet. For general greetings, reply with a brief friendly hello."}`;

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
