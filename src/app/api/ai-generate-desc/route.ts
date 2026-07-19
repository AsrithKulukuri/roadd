import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in the environment." },
        { status: 500 }
      );
    }

    const { type, location, price, bhk, size, features } = await req.json();

    const prompt = `You are an expert luxury real estate copywriter. 
Write a highly compelling, professional, and SEO-friendly property description (about 3-4 paragraphs) for a real estate listing.

Property Details:
- Type: ${type}
- Location: ${location}
- Price: ₹${price}
- Configuration: ${bhk} BHK
- Size: ${size} sq.ft
- Key Features: ${features || 'Premium amenities, modern design, excellent connectivity'}

Make the tone luxurious, inviting, and professional. Highlight the lifestyle and investment value. Do not use asterisks or markdown, just plain text with paragraphs.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const description = response.text;

    return NextResponse.json({ description });
    
  } catch (error: any) {
    console.error("AI Description Error:", error);
    return NextResponse.json(
      { error: "Failed to generate description." },
      { status: 500 }
    );
  }
}
