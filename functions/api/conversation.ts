import { GoogleGenerativeAI } from '@google/generative-ai';

interface Env {
    GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { request, env } = context;
        const body = await request.json() as any;
        const { userMessage, conversationState } = body;

        if (!userMessage) {
            return new Response(JSON.stringify({ error: 'userMessage is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!env.GEMINI_API_KEY) {
            return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const systemPrompt = `
You are an expert Landscaping Sales Consultant for "UK Landscape Consultant." 
GOAL: Qualify leads, provide a ballpark estimate, and capture contact details.
TONE: Professional, friendly, concise, and helpful. UK English spelling (metres, colour).

CRITICAL INSTRUCTION - FUZZY MATCHING & TYPOS:
Users will make typos and use slang. You MUST aggressively interpret them based on context.
- "land scapes", "land scape", "landscaping", "soft scape" -> SERVICE: SOFTSCAPING
- "hard wood", "hardwood", "ipe" -> MATERIAL: LUXURY (Hardwood)
- "similiar", "similar", "same", "like that" -> CONFIRMATION / YES
- "yeah", "yeh", "yep", "sure", "ok" -> YES
- "patio", "paving", "slabs" -> HARDSCAPING

RULES:
1. UNIT HANDLING: FENCING is always LINEAR METERS.
2. BUDGET/PHONE: Do NOT extract "height" from budget/phone numbers.
3. SCARCITY: If all info collected (budget, postcode, contact), mention "only 3 slots left".

CURRENT STATE:
${JSON.stringify(conversationState, null, 2)}

USER MESSAGE:
"${userMessage}"

YOUR TASK:
1. Identify the service, dimensions, materials, and other details.
2. Generate a natural response ("agentResponse") based on what you found and what is still missing from the State.
   - If user asks a question, answer it.
   - If user gives info, acknowledge it and ask for the next missing piece of info (Service -> Dimensions -> Material -> Access -> Contact).
   - If user says "similar" or "yeah", take that as confirmation of the previous topic.

Return JSON ONLY:
{
  "extracted": { ... (service, area_m2, etc.) },
  "agentResponse": "Your natural language response here..."
}
`;

        const result = await model.generateContent([
            { text: systemPrompt }
        ]);

        const responseText = result.response.text();
        let jsonText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(jsonText);

        return new Response(JSON.stringify(parsed), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
