import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, company, designation, email, phone, website, linkedin, photo_url, logo_url, prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Generating email signatures for:', name, 'with prompt:', prompt);

    const hasPhoto = !!photo_url;
    const hasLogo = !!logo_url;
    
    // Determine signature variants based on available assets
    let variantInstructions = '';
    if (hasPhoto && hasLogo) {
      variantInstructions = `Generate exactly 3 signature variations:
1. First signature: WITHOUT photo and WITHOUT logo (minimal/text-only style)
2. Second signature: WITHOUT photo but WITH logo (brand-focused style)
3. Third signature: WITH photo AND WITH logo (complete/premium style)`;
    } else if (hasPhoto) {
      variantInstructions = `Generate exactly 3 signature variations:
1. First signature: WITHOUT photo (minimal/text-only style)
2. Second signature: WITH photo (photo on left side)
3. Third signature: WITH photo (different layout, photo prominent)`;
    } else if (hasLogo) {
      variantInstructions = `Generate exactly 3 signature variations:
1. First signature: WITHOUT logo (minimal/text-only style)
2. Second signature: WITH logo (brand-focused)
3. Third signature: WITH logo (different layout)`;
    } else {
      variantInstructions = `Generate exactly 3 text-only signature variations with different layouts and styles (no images available).`;
    }

    const systemPrompt = `You are an expert email signature designer specializing in creating email-safe HTML signatures that work perfectly in Gmail, Outlook, and Apple Mail.

CRITICAL: You MUST follow the user's style instructions EXACTLY. The user has specifically requested: "${prompt || 'Professional and modern'}"

User Profile Data (use these exact values):
- Name: ${name || 'Not provided'}
- Designation/Title: ${designation || 'Not provided'}
- Company: ${company || 'Not provided'}
- Email: ${email || 'Not provided'}
- Phone: ${phone || 'Not provided'}
- Website: ${website || 'Not provided'}
- LinkedIn: ${linkedin || 'Not provided'}
- Photo URL: ${photo_url || 'None'}
- Logo URL: ${logo_url || 'None'}

STRICT EMAIL-SAFE HTML RULES (MUST FOLLOW):
1. Use ONLY <table>, <tr>, <td>, <a>, <img>, <span>, <strong>, <br> tags
2. NO <div>, NO flexbox, NO grid, NO CSS classes
3. ALL styles MUST be inline using style="" attribute
4. Use ONLY these fonts: Arial, Helvetica, Georgia, 'Times New Roman'
5. Use absolute URLs for all images
6. Set explicit width/height on images
7. Use cellpadding="0" cellspacing="0" border="0" on all tables
8. Max signature width: 500px, Max height: 200px
9. Colors must be hex codes (e.g., #4F46E5)

VARIANT REQUIREMENTS:
${variantInstructions}

PHOTO/LOGO RULES:
- If including photo: use as circular/rounded image (max 80x80px)
- If including logo: size appropriately (max height 40px)
- Always use object-fit equivalent via cropping/sizing

STYLE INTERPRETATION (follow the user's request "${prompt || 'Professional'}"):
- "minimal" = clean lines, no decorations, simple text layout
- "bold" or "premium" = stronger colors, accent borders
- "startup" = modern, casual, tech-forward
- "corporate" or "formal" = traditional, serif fonts allowed, conservative

Return a JSON array with exactly 3 objects:
[
  { "name": "Style Name 1", "html": "<table>...</table>" },
  { "name": "Style Name 2", "html": "<table>...</table>" },
  { "name": "Style Name 3", "html": "<table>...</table>" }
]

CRITICAL: Return ONLY the raw JSON array. No markdown, no code blocks, no explanations.`;

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
          { role: "user", content: "Generate 4 email signature variations now." }
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
    let generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error("No signatures generated");
    }

    // Clean up the response - remove markdown code blocks if present
    generatedContent = generatedContent.trim();
    if (generatedContent.startsWith('```json')) {
      generatedContent = generatedContent.slice(7);
    } else if (generatedContent.startsWith('```')) {
      generatedContent = generatedContent.slice(3);
    }
    if (generatedContent.endsWith('```')) {
      generatedContent = generatedContent.slice(0, -3);
    }
    generatedContent = generatedContent.trim();

    let signatures;
    try {
      signatures = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse signatures JSON:', parseError);
      console.error('Raw content:', generatedContent);
      throw new Error("Failed to parse generated signatures");
    }

    if (!Array.isArray(signatures) || signatures.length === 0) {
      throw new Error("Invalid signatures format");
    }

    console.log('Generated', signatures.length, 'signatures successfully');

    return new Response(JSON.stringify({ signatures }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-signatures function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
