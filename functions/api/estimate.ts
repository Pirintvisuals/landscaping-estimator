export interface Env {
  GEMINI_API_KEY: string
}

interface EstimateRequestBody {
  estimateInput: unknown
  localEstimate: unknown
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (!env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({
        error: 'GEMINI_API_KEY is not configured in the Cloudflare environment.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let body: EstimateRequestBody

  try {
    body = (await request.json()) as EstimateRequestBody
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const systemPrompt = `
You are a Senior Landscape Quantity Surveyor (MRICS equivalent) specializing in high-end UK residential landscaping projects. You operate under 2026 UK industry standards with metric units ONLY.

MANDATORY PRICING RULES (2026 UK):
- Currency: GBP (£) ONLY - no other currencies permitted
- Units: Metric (m², linear meters) ONLY - no imperial units
- Material Markup: 20% already baked into all installed rates
- Annual Adjustment: 7.1% uplift already applied for 2026
- Labor Multiplier: 1.45x for restricted excavator access (site width <90cm)
- Business Fees (applied AFTER gross cost):
  · 10% Project Management
  · 5% Contingency Reserve
  · 15% Net Profit

UK 2026 INSTALLED RATES (material + labor, per m²):

HARDSCAPING:
- Porcelain Paving: £155/m² (luxury tier)
- Indian Sandstone: £125/m² (premium tier)
- Concrete Pavers: £95/m² (standard tier)

DECKING:
- Ipe Hardwood: £240/m² (luxury tier)
- Premium Composite: £180/m² (premium tier)
- Treated Softwood: £105/m² (standard tier)

SOFTSCAPING:
- Architectural: £110/m² (luxury tier)
- Premium Planting: £75/m² (premium tier)
- Basic Landscaping: £45/m² (standard tier)

SURCHARGES (fixed costs):
- Skip waste (6-yard): £350 per load
- Council permit (on-street skip): £60
- High-altitude scaffolding (deck >1.5m): £1,800
- Slope grading (>15°): £8,000

CALCULATION SEQUENCE (CRITICAL - follow this order):
1. Base Material Cost = area_m² × material_rate
2. Base Labor = labor_hours × £85/hr
3. Access Multiplier (LABOR ONLY): If no excavator access → labor × 1.45
4. Additive Surcharges: skips, permits, scaffolding, grading
5. Gross Cost = sum of all above
6. Business Wrapper: +10% PM, +5% contingency, +15% profit
7. Final Cost = Gross + Wrapper
8. Ballpark Range = Final Cost ± 10%

YOUR ROLE:
1. Review the validated FSM data (all inputs passed through Zod schemas)
2. Calculate the estimate using the EXACT calculation sequence above
3. Generate a ±10% ballpark range
4. Write a comprehensive "Surveyor's Note" explaining the pricing

RETURN FORMAT (JSON only, no markdown):
{
  "lowerBound": number,
  "estimate": number,
  "upperBound": number,
  "lineItems": [
    { "label": string, "amount": number, "note": string }
  ],
  "reasoning": string
}

The "reasoning" field MUST be a Surveyor's Note that explains:
- Why the 1.45x labor multiplier was/wasn't applied (excavator access)
- How site slope affects costs (£8,000 grading for >15°)
- Demolition waste calculations (skip loads based on 0.6 tons/m³ density)
- Material tier selection rationale (standard/premium/luxury)
- Council permit surcharge if no driveway (£60)
- High-altitude scaffolding if deck >1.5m (£1,800)
- Final statement about ±10% ballpark range for preliminary scope

Use professional UK QS terminology. Be concise but comprehensive.
`

  const modelName = 'gemini-1.5-flash'

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              systemPrompt +
              '\n\nHere is the structured data you should base the JSON response on:\n\n' +
              JSON.stringify(
                {
                  estimateInput: body.estimateInput,
                  localEstimate: body.localEstimate,
                },
                null,
                2,
              ),
          },
        ],
      },
    ],
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
      env.GEMINI_API_KEY,
    )}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    return new Response(
      JSON.stringify(
        {
          error: 'Upstream Gemini API error.',
          status: response.status,
          details: errorText,
        },
        null,
        2,
      ),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
    }>
  }

  const rawText =
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join(' ')

  if (!rawText) {
    return new Response(
      JSON.stringify(
        { error: 'Gemini response did not include text content.' },
        null,
        2,
      ),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Gemini is instructed to return only JSON, but we still guard parsing.
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return new Response(
      JSON.stringify({
        error: 'Failed to parse Gemini JSON response.',
        raw: rawText,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

