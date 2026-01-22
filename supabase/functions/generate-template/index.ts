import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, channel } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Generating template for channel:', channel, 'with prompt:', prompt);

    const isEmail = channel === 'email' || channel === 'both';
    
    const systemPrompt = `You are a professional business communication expert. Generate a ${channel === 'whatsapp' ? 'WhatsApp message' : channel === 'email' ? 'email' : 'message'} template based on the user's description.

IMPORTANT: Include these placeholders in your template:
- {{name}} - recipient's name
- {{company}} - recipient's company
- {{designation}} - recipient's job title
- {{myName}} - sender's name
- {{myCompany}} - sender's company

CRITICAL RULES:
- Keep it SHORT and to-the-point (max 50 words for body)
- For WhatsApp: Very concise (under 40 words), casual tone, minimal emojis
- For Email: Slightly longer but still brief, professional greeting and sign-off
- Make it sound natural, not robotic
- Focus on one clear purpose per message

${isEmail ? `Return a JSON object with this exact format:
{
  "subject": "Email subject line with {{placeholders}} if needed",
  "body": "Short email body text"
}` : `Return ONLY the template text, no explanations or markdown.`}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a ${channel} template for: ${prompt}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error("No template generated");
    }

    console.log('Generated content:', generatedContent);

    // Parse response based on channel
    if (isEmail) {
      try {
        // Try to parse as JSON for email (subject + body)
        const cleanedContent = generatedContent.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanedContent);
        return new Response(JSON.stringify({ 
          subject: parsed.subject?.trim() || `Hello {{name}}`,
          template: parsed.body?.trim() || generatedContent.trim()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        // Fallback: use content as body, generate default subject
        return new Response(JSON.stringify({ 
          subject: `Hello {{name}} - {{myName}} from {{myCompany}}`,
          template: generatedContent.trim() 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ template: generatedContent.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-template function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
