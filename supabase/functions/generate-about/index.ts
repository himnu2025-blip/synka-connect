import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* --------------------------------------------------
   ENV KEYS
-------------------------------------------------- */
const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

/* --------------------------------------------------
   SERPER GOOGLE SEARCH
-------------------------------------------------- */
async function serperSearch(query: string) {
  if (!SERPER_API_KEY) return [];

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 5,
      }),
    });

    const data = await res.json();
    return data.organic || [];
  } catch (err) {
    console.error("Serper search failed:", err);
    return [];
  }
}

/* --------------------------------------------------
   FETCH PAGE TEXT (SAFE LIMIT)
-------------------------------------------------- */
async function fetchPageSnippet(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await res.text();

    // crude cleanup (good enough for AI context)
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .slice(0, 2500);
  } catch {
    return "";
  }
}

/* --------------------------------------------------
   EDGE FUNCTION
-------------------------------------------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      name,
      company,
      designation,
      email,
      linkedin,
    } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    /* ------------------------------
       1. WEB SEARCH QUERIES
    ------------------------------ */
    const personQuery = linkedin
      ? `LinkedIn profile ${name} ${linkedin}`
      : `${name} ${designation || ""} LinkedIn`;

    const companyQuery = company
      ? `${company} official website about`
      : "";

    /* ------------------------------
       2. RUN SEARCHES
    ------------------------------ */
    const personResults = await serperSearch(personQuery);
    const companyResults = company ? await serperSearch(companyQuery) : [];

    const linkedinUrl = personResults[0]?.link || "";
    const companyUrl = companyResults[0]?.link || "";

    /* ------------------------------
       3. FETCH PAGE CONTENT
    ------------------------------ */
    const linkedinText = linkedinUrl
      ? await fetchPageSnippet(linkedinUrl)
      : "";

    const companyText = companyUrl
      ? await fetchPageSnippet(companyUrl)
      : "";

    /* ------------------------------
       4. BUILD AI PROMPT
    ------------------------------ */
    const prompt = `
You are writing a professional "About Me" summary for a digital business card.

RULES:
- Write in FIRST PERSON
- 4–6 short, elegant lines
- Professional, warm, human tone
- DO NOT invent companies, dates, or job history
- If details are unclear, keep it high-level and honest

USER PROVIDED INFO:
Name: ${name || "N/A"}
Designation: ${designation || "N/A"}
Company: ${company || "N/A"}
Email: ${email || "N/A"}
LinkedIn: ${linkedin ? "linkedin.com/in/" + linkedin : "N/A"}

PUBLIC WEB CONTEXT (may be partial):
LinkedIn page text:
${linkedinText || "No reliable LinkedIn content found"}

Company page text:
${companyText || "No reliable company content found"}

TASK:
Create a polished professional summary that explains:
- Who this person is
- What they do professionally
- Their area of expertise or focus
- The nature of the company (if available)
- A forward-looking professional tone

Write ONLY the summary paragraph. No headings. No URLs.
`;

    /* ------------------------------
       5. CALL LOVABLE AI
    ------------------------------ */
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an expert personal branding copywriter. Write concise, authentic summaries that do not sound AI-generated.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Lovable error:", errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const about =
      aiData.choices?.[0]?.message?.content?.trim() || "";

    /* ------------------------------
       6. RETURN RESULT
    ------------------------------ */
    return new Response(JSON.stringify({ about }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";

    console.error("generate-about error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
