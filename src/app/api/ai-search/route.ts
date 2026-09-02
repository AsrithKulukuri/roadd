import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

// Rate Limiter Map for AI routes (Hetzner in-memory state)
const aiRateLimitMap: Map<string, { count: number; resetAt: number }> =
  (globalThis as any).__ai_rate_limit_map || new Map();
(globalThis as any).__ai_rate_limit_map = aiRateLimitMap;

function checkAiRateLimit(ip: string, maxPerMin = 25): boolean {
  const now = Date.now();
  const entry = aiRateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    aiRateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= maxPerMin) {
    return false;
  }
  entry.count += 1;
  return true;
}

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

interface ClassifiedAiError {
  status: number;
  code: "AI_RATE_LIMITED" | "AI_QUOTA_EXHAUSTED" | "AI_UNAVAILABLE" | "AI_TIMEOUT" | "INVALID_INPUT" | "AI_PARSE_ERROR" | "AI_ERROR";
  message: string;
  retryable: boolean;
}

function classifyAiError(err: any): ClassifiedAiError {
  const msg = (err?.message || "").toLowerCase();
  const status = typeof err?.status === "number" ? err.status : 0;

  // Rate Limiting / Quota
  if (status === 429 || msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("rate limit") || msg.includes("too many requests")) {
    return {
      status: 429,
      code: msg.includes("quota") ? "AI_QUOTA_EXHAUSTED" : "AI_RATE_LIMITED",
      message: "AI search rate limit reached. Please try again shortly or use manual search filters.",
      retryable: false,
    };
  }

  // Timeout
  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("aborted") || msg.includes("deadline_exceeded")) {
    return {
      status: 504,
      code: "AI_TIMEOUT",
      message: "AI search request timed out. Please try again or use direct search.",
      retryable: true,
    };
  }

  // Unavailable / 503
  if (status === 503 || msg.includes("unavailable") || msg.includes("overloaded") || msg.includes("service unavailable")) {
    return {
      status: 503,
      code: "AI_UNAVAILABLE",
      message: "AI search service is temporarily unavailable. Standard search remains active.",
      retryable: true,
    };
  }

  // Bad input
  if (status === 400 || msg.includes("invalid argument") || msg.includes("bad request")) {
    return {
      status: 400,
      code: "INVALID_INPUT",
      message: "Invalid query provided to AI search.",
      retryable: false,
    };
  }

  // Generic failure
  return {
    status: 500,
    code: "AI_ERROR",
    message: "Unable to process AI search at this time.",
    retryable: false,
  };
}

async function callGeminiWithTimeout(ai: GoogleGenAI, promptText: string, timeoutMs = 8000) {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("AI request timed out")), timeoutMs);
  });

  const apiPromise = ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
      temperature: 0.1,
    }
  });

  return Promise.race([apiPromise, timeoutPromise]);
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    if (!checkAiRateLimit(ip, 25)) {
      return NextResponse.json(
        { error: "Too many AI search requests. Please slow down and try again in a minute.", code: "AI_RATE_LIMITED" },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { prompt, history = "" } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Valid search prompt is required", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI search is currently disabled in this environment.", code: "AI_DISABLED" },
        { status: 503 }
      );
    }

    // Input bounds check to prevent token abuse
    const cleanPrompt = prompt.trim().slice(0, 500);

    const systemPrompt = `You are an AI real estate assistant for ROAD FACING, an Indian real estate platform.
Your job is to act as a conversational assistant while seamlessly parsing search filters when the user's intent is to find properties.

CURRENT INVENTORY AWARENESS:
We currently have these property types available: 'apartment', 'villa', 'independent-house', 'commercial-spaces', 'pg-coliving', 'farmhouse', and 'residential-land' (which means plots).
If the user asks for a property type that is NOT on this list (e.g. 'castles', 'spaceships', 'islands'), inform them politely that we don't have that available right now and DO NOT set isSearch to true.
If they ask for 'plots', map it to 'residential-land' and proceed with the search (set isSearch to true).

Rules:
1. Always parse the user query into structured filters.
2. If they mention a location like 'Gachibowli' or 'Banjara Hills', set location to that string.
3. If they specify BHK (e.g. '3bhk', '3 bedroom'), set bhk accordingly ('1', '2', '3', '4', '5+', or 'any').
4. If they give a budget constraint, extract numeric [min, max] in INR.
5. If the user is just saying 'hello', 'who are you', or asking general questions, set isSearch to false and give a helpful messageToUser introducing yourself as the ROAD FACING AI assistant.
6. Provide a concise, warm messageToUser reflecting what you are searching for or responding to them.
7. Consider previous conversation context when parsing intent: ${String(history).slice(0, 1000)}`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const fullPrompt = `${systemPrompt}\n\nUser Query: "${cleanPrompt}"`;

    let response: any;
    try {
      response = await callGeminiWithTimeout(ai, fullPrompt, 8000);
    } catch (primaryErr: any) {
      const classified = classifyAiError(primaryErr);
      if (classified.retryable) {
        // Retry once after 350ms backoff
        await new Promise((resolve) => setTimeout(resolve, 350));
        response = await callGeminiWithTimeout(ai, fullPrompt, 8000);
      } else {
        throw primaryErr;
      }
    }

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No text returned from Gemini");
    }

    const parsedData = JSON.parse(resultText);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    const classified = classifyAiError(error);
    console.error("[AI Search API Diagnostic]:", {
      code: classified.code,
      status: classified.status,
      retryable: classified.retryable,
      errorName: error?.name,
    });
    return NextResponse.json(
      {
        error: classified.message,
        code: classified.code,
        retryable: classified.retryable,
      },
      { status: classified.status }
    );
  }
}
