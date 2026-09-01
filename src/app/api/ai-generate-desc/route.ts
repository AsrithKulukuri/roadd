import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { requireAdmin } from '@/lib/server-auth-guard';

function generateFallbackDescription(data: any): string {
  const { title, name, type, location, price, bhk, size, features, projectType, builderName } = data || {};
  const entityName = title || name || "Exclusive Real Estate Opportunity";
  const propertyCategory = type || projectType || "Apartment";
  const loc = location || "Prime AP Location";
  const formattedPrice = price ? `₹${price}` : "Attractive Price on Request";
  const areaSpec = size ? `${size} sq.ft` : "Spacious layout";
  const bhkSpec = bhk ? `${bhk} BHK` : "Spacious Configurations";

  return `Welcome to ${entityName}, an exceptional ${bhkSpec} ${propertyCategory} positioned in the prestigious hub of ${loc}. Thoughtfully designed to blend contemporary architecture with unparalleled everyday comfort, this property offers ${areaSpec} of meticulously planned living space that maximizes natural sunlight, cross-ventilation, and privacy.

Featuring premium finishes, wide balconies with panoramic views, and an array of lifestyle amenities, this property caters to those who demand the finest in residential excellence. Residents enjoy seamless access to major transport corridors, top-tier schools, healthcare institutions, and bustling commercial centers.

Offered at ${formattedPrice}, this landmark home presents a rare opportunity for both discerning homeowners and savvy investors seeking strong appreciation in one of the region's fastest-growing corridors. Schedule your private walkthrough today.`;
}

export async function POST(req: Request) {
  const { errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const { type, location, price, bhk, size, features, title, name, builderName } = body;

        const prompt = `You are an expert luxury real estate copywriter. 
Write a highly compelling, professional, and SEO-friendly property description (about 3 paragraphs) for a real estate listing.

Property Details:
- Title/Name: ${title || name || ''}
- Type: ${type || 'Residential'}
- Location: ${location || 'Andhra Pradesh'}
- Price: ₹${price || 'On Request'}
- Configuration: ${bhk || ''} BHK
- Size: ${size || ''} sq.ft
- Builder: ${builderName || ''}
- Key Features: ${features || 'Premium amenities, modern design, excellent connectivity, 24/7 security'}

Make the tone luxurious, inviting, and professional. Highlight the lifestyle and investment value. Format into 3 clean paragraphs without asterisks or markdown.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        if (response?.text) {
          return NextResponse.json({ description: response.text });
        }
      } catch (genError) {
        console.warn("Gemini API call failed, falling back to smart generator:", genError);
      }
    }

    // Smart generator fallback
    const description = generateFallbackDescription(body);
    return NextResponse.json({ description });

  } catch (error: any) {
    console.error("AI Description Error:", error);
    return NextResponse.json(
      { description: generateFallbackDescription({}) },
      { status: 200 }
    );
  }
}

