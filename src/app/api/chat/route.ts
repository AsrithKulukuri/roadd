import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { mockProperties } from "@/lib/mock-data";

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI Assistant is currently unavailable due to missing configuration." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Compress properties to save context window and focus the AI on searchable fields
    const compressedProperties = mockProperties.map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      type: p.propertyType,
      listingType: p.listingType,
      bedrooms: p.bedrooms,
      locality: p.location.locality,
      city: p.location.city,
      amenities: p.amenities.map((a) => a.name).join(", "),
      url: `/properties/${p.slug}`,
    }));

    const systemInstruction = `You are the official AI Support Assistant for ROAD FACING (Real Owner Agent Developer).
Your job is to help users understand and use the ROAD FACING platform. Be friendly, professional, and accurate.

## About ROAD FACING
ROAD FACING is a premium real estate marketplace that connects Property Owners, Real Estate Agents, Builders & Developers, Buyers, Renters, and Investors.

## Available Properties Database
Use this JSON data to answer queries about availability, budget, amenities, or location. Do NOT mention that this is a JSON or a database, just seamlessly recommend properties from this list.
${JSON.stringify(compressedProperties, null, 2)}

## Core Features
- User Accounts: Register, login, edit profile, save favorites.
- Property Listings: Add, edit, delete, mark sold/rented, upload images/videos.
- Search: Search by city, locality, budget, bedrooms, type.
- Dashboard & Admin Dashboard.
- Subscriptions: Free, Basic, Premium, Developer, Enterprise.

## Rules
Always:
- Be polite, concise, modern, and helpful. Use markdown to format lists and bold text.
- If the user asks for properties matching criteria (like budget, amenities, or location), search the database above and provide the exact titles, prices, and locations. Provide the relative URL for them to view it.
- If the user wants to connect with an agent/owner, schedule a visit, or speak to a human, redirect them to WhatsApp at: 8977311418.
Never:
- Make legal decisions, give valuations, guarantee returns, approve listings, reveal admin data, or guess information.
- If asked something outside ROAD FACING, politely explain you only assist with ROAD FACING platform usage and general real estate guidance.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
    });

    // We pass the history as is, assuming it follows the { role: "user"|"model", parts: [{ text: "..." }] } format
    const chat = model.startChat({
      history: history || [],
    });

    const result = await chat.sendMessageStream(message);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(new TextEncoder().encode(chunkText));
          }
          controller.close();
        } catch (e) {
          console.error("Stream error:", e);
          controller.error(e);
        }
      }
    });

    return new Response(stream, {
      headers: { 
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked"
      },
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 }
    );
  }
}
