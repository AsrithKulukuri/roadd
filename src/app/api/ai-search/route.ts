import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

// Initialize SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    location: {
      type: Type.STRING,
      description: "The city, neighborhood, or locality the user wants to search in. E.g. 'Hyderabad', 'Jubilee Hills', 'Bandra'. Return empty string if not specified.",
    },
    propertyType: {
      type: Type.STRING,
      description: "The exact property type if mentioned. Allowed values: 'any', 'villa', 'apartment', 'independent-house', 'plot'. If 'flat' or 'condo', map to 'apartment'. Default to 'any'.",
    },
    budget: {
      type: Type.ARRAY,
      description: "An array of exactly two numbers [min, max] representing the budget in Indian Rupees. If they say 'under 2 Cr', return [0, 20000000]. If they say 'above 50 lakhs', return [5000000, 1000000000]. If not specified, return [0, 100000000].",
      items: { type: Type.NUMBER }
    },
    bhk: {
      type: Type.STRING,
      description: "The exact BHK configuration. Allowed values: 'any', '1', '2', '3', '4', '5+'. Default to 'any'.",
    },
    isSearch: {
      type: Type.BOOLEAN,
      description: "Set to true if the user's query is actually looking for properties. Set to false if it is just a greeting, a general question, or conversational (e.g. 'hi', 'sup', 'how are you').",
    },
    messageToUser: {
      type: Type.STRING,
      description: "A friendly, conversational response to the user acknowledging their request (e.g. 'Sure! Looking for 3 BHK villas under ₹2 Cr in Jubilee Hills...'). Max 2 sentences.",
    }
  },
  required: ["location", "propertyType", "budget", "bhk", "isSearch", "messageToUser"],
};

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in the environment." },
        { status: 500 }
      );
    }

    const { prompt, history = "" } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const systemPrompt = `You are an AI real estate assistant for ROAD FACING, an Indian real estate platform.
Your job is to act as a conversational assistant while seamlessly parsing search filters when the user's intent is to find properties.

CURRENT INVENTORY AWARENESS:
We currently have these property types available: 'apartment', 'villa', 'independent-house', 'commercial-spaces', 'pg-coliving', 'farmhouse', and 'residential-land' (which means plots).
If the user asks for a property type that is NOT on this list (e.g. 'castles', 'spaceships', 'islands'), inform them politely that we don't have that available right now and DO NOT set isSearch to true.
If they ask for 'plots', map it to 'residential-land' and proceed with the search (set isSearch to true).

CONVERSATION HISTORY:
${history}

LATEST USER MESSAGE:
"${prompt}"

INSTRUCTIONS:
1. Parse the latest user message in the context of the conversation history.
2. If the user is just chatting or asking for something unavailable, respond politely in 'messageToUser' and set 'isSearch' to false.
3. If they are looking for available properties, extract the filters (location, type, budget, bhk), set 'isSearch' to true, and say something like "Sure, I found some options for you!" in 'messageToUser'.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text returned from Gemini");
    }

    const filters = JSON.parse(text);
    return NextResponse.json(filters);
    
  } catch (error: any) {
    console.error("AI Search Error:", error);
    return NextResponse.json(
      { error: "Failed to process AI search." },
      { status: 500 }
    );
  }
}
