import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json().catch(() => ({}))
    const { name, category, mode = 'full', prompt } = body

    if (!name && !prompt) {
      return NextResponse.json({ error: 'Please enter a product name or prompt for Gemini AI' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim() || ''

    const systemInstruction = `You are Gemini AI assistant for ZYRØCORE — a high-end, timeless minimalist clothing brand built for ambitious individuals.
Generate detailed, premium product specifications and description in clean JSON format for the product "${name || prompt}" ${category ? `in category "${category}"` : ''}.

Return ONLY a valid JSON object matching this exact JSON structure without markdown codeblock wrappers or additional commentary:
{
  "description": "A compelling 2-3 paragraph product overview written in ZYRØCORE's signature minimalist, sleek tone.",
  "product_details": {
    "Material": "100% Premium Cotton / Terry Blend",
    "Fabric": "Heavyweight Premium Weave",
    "GSM": "340 GSM",
    "Fit": "Relaxed Oversized Fit",
    "Sleeve Type": "Drop Shoulder / Full Sleeve",
    "Neck Type": "Double-Layered Ribbed Collar / Hood",
    "Pattern": "Minimalist Tone-on-Tone",
    "Wash Care": "Machine wash cold inside out with like colors",
    "Country of Origin": "India (Tamil Nadu)"
  },
  "suggested_sizes": ["S", "M", "L", "XL", "XXL"]
}`

    const userPrompt = prompt
      ? `Generate product details, description, and key-value specs for: ${prompt}`
      : `Generate ZYRØCORE product details, description, and specifications for: "${name}" ${category ? `(Category: ${category})` : ''}`

    // Call Gemini AI REST API if key is provided
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro']
    let aiResponseText = ''

    if (apiKey) {
      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                responseMimeType: 'application/json',
              },
            }),
          })

          if (res.ok) {
            const json = await res.json()
            const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text
            if (candidateText) {
              aiResponseText = candidateText
              break
            }
          }
        } catch (e) {
          console.warn(`[Gemini AI] Model ${model} failed, trying next...`, e)
        }
      }
    }

    if (!aiResponseText) {
      // Fallback generator if API key or endpoint returns empty response
      return NextResponse.json({
        description: `${name || 'This essential ZYRØCORE garment'} is engineered for those who move with quiet confidence. Crafted from heavyweight premium cotton with reinforced structural stitching, it offers effortless comfort and timeless minimalist silhouette built to outlast seasonal trends.`,
        product_details: {
          "Material": "100% Premium French Terry Cotton",
          "Fabric": "Heavyweight 340 GSM Weave",
          "GSM": "340 GSM",
          "Fit": "Relaxed Oversized Fit",
          "Sleeve Type": "Drop Shoulder",
          "Neck Type": "Reinforced Crew Neck",
          "Wash Care": "Machine wash cold, tumble dry low",
          "Country of Origin": "India",
        },
        suggested_sizes: ["S", "M", "L", "XL", "XXL"]
      })
    }

    // Clean JSON response from Gemini
    let cleanJsonStr = aiResponseText.trim()
    if (cleanJsonStr.startsWith('```json')) {
      cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, '').replace(/```$/, '').trim()
    } else if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.replace(/^```\s*/, '').replace(/```$/, '').trim()
    }

    try {
      const parsed = JSON.parse(cleanJsonStr)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({
        description: aiResponseText,
        product_details: {
          "Overview": name || "ZYRØCORE Premium Essential",
          "Craftsmanship": "100% Premium Cotton",
        },
        suggested_sizes: ["S", "M", "L", "XL", "XXL"]
      })
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 })
    }
    console.error('[admin/generate-ai] Error:', error)
    return NextResponse.json({ error: 'Failed to generate AI content' }, { status: 500 })
  }
}
