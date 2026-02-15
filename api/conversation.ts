import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userMessage, conversationState } = request.body;

        if (!userMessage) {
            return response.status(400).json({ error: 'userMessage is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured');
            return response.status(500).json({ error: 'Server configuration error' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const systemPrompt = `
You are an expert Landscaping Sales Consultant for "UK Landscape Consultant." Your goal is to qualify leads, provide a ballpark estimate, and capture contact details for the owner.

YOUR CORE LOGIC & RULES:
1. UNIT HANDLING: 
   - For FENCING: Always ask for and calculate by "Linear Meters" or "Perimeter Length." NEVER use square meters for fences.
   - FOR BUDGET/PHONE: Treat numbers as currency/phone. NEVER extract "height" or "deckHeight_m" from budget or phone numbers. ONLY extract 'deckHeight_m' if the service is explicitly DECKING.
2. SERVICE CAPTURE: Explicitly identify the service at the start.
3. CLOSING (The Scarcity Trap):
   - Once all data is collected (Estimate shown, contact details captured), say: "I've gathered everything. Because it's currently peak season, we are actually only taking on 3 more {{service_type}} projects before the summer starts to ensure we maintain our high standards. I’ll send this over to our senior surveyor right now."

═══════════════════════════════════════════════════════════════════
PROFESSIONAL LANDSCAPING KNOWLEDGE BASE
═══════════════════════════════════════════════════════════════════

SERVICES WE PROVIDE:
(Same as before, but ensure Fencing uses Linear Meters in your internal logic arguments)

1. HARDSCAPING (Patios & Paving)
2. DECKING
3. FENCING & PRIVACY
   • Western Red Cedar Slatted: £120-180/linear meter
   • Featheredge (Standard): £40-70/linear meter
4. FRAMING (Pergolas & Structures)
5. PLANTING
6. SOFTSCAPING
7. MOWING & GROUNDS MAINTENANCE

═══════════════════════════════════════════════════════════════════
CURRENT CONVERSATION STATE
═══════════════════════════════════════════════════════════════════
${JSON.stringify(conversationState, null, 2)}

USER MESSAGE:
"${userMessage}"

═══════════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════════

1. Understand what the user is asking/saying.
2. Extract any project data from their message.
3. Return the extracted data in JSON format.

EXTRACTION MAPPING:
• Service: hardscaping, decking, fencing, framing, planting, softscaping, mowing
• Material Tier: "standard", "premium", "luxury"
• Dimensions: 
    - area_m2 (default for paving/mowing)
    - length_m (for fencing/linear)
    - width_m
• Site: hasExcavatorAccess, hasDrivewayForSkip, slopeLevel (flat/moderate/steep), existingDemolition
• Specific: deckHeight_m, overgrown (true if >2 weeks), gateCount
• Upsells: wantsDrainage, wantsLedLighting
• User Info: fullName, contactPhone, contactEmail, userBudget
• NEW FIELDS:
    - projectStartTiming: "ASAP", "Spring", "Summer", "Next month", etc.
    - groundSoilType: "Clay", "Chalk", "Sand", "Flat", "Steep" (anything describing ground description beyond slope)

RESPONSE FORMAT (JSON only):
{
  "extracted": {
    "service": "fencing" | null,
    "area_m2": null,
    "length_m": 25 | null,
    "width_m": null,
    "materialTier": "premium" | null,
    "hasExcavatorAccess": true | null,
    "hasDrivewayForSkip": true | null,
    "slopeLevel": "flat" | null,
    "subBaseType": "dirt" | null,
    "existingDemolition": false | null,
    "deckHeight_m": null,
    "overgrown": false | null,
    "gateCount": null,
    "wantsDrainage": true | null,
    "wantsLedLighting": true | null,
    "fullName": "Name Here" | null,
    "contactPhone": "Phone Here" | null,
    "contactEmail": "Email Here" | null,
    "userBudget": 5000 | null,
    "projectStartTiming": "Spring 2026" | null,
    "groundSoilType": "Clay" | null
  },
  "confidence": 75
}
`;

        const result = await model.generateContent([
            { text: systemPrompt }
        ]);

        const responseText = result.response.text();

        // Parse JSON from response (strip markdown if present)
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '');
        }

        const parsed = JSON.parse(jsonText);

        return response.status(200).json(parsed);

    } catch (error) {
        console.error('Conversation API error:', error);
        // Fallback response
        return response.status(200).json({
            extracted: {},
            confidence: 0,
            note: 'Fallback mode active'
        });
    }
}
