import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_OG_IMAGE = "https://synka.in/og/default.png";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response("Slug required", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, designation, title, company, photo_url")
      .eq("slug", slug)
      .maybeSingle();

    let name = "Synka User";
    let role = "";
    let company = "";
    let photoUrl = "";

    if (profile) {
      const { data: defaultCard } = await supabase
        .from("cards")
        .select("full_name, designation, title, company, photo_url")
        .eq("user_id", profile.user_id)
        .eq("is_default", true)
        .maybeSingle();

      // Safety fallback: if is_default is not set correctly, pick the most recently updated card.
      const { data: latestCard } = defaultCard
        ? { data: null }
        : await supabase
            .from("cards")
            .select("full_name, designation, title, company, photo_url")
            .eq("user_id", profile.user_id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

      const card = defaultCard || latestCard;

      name = card?.full_name || profile.full_name || name;
      role = card?.designation || card?.title || profile.designation || profile.title || "";
      company = card?.company || profile.company || "";
      photoUrl = card?.photo_url || profile.photo_url || "";
    }

    const safeName = escapeHtml(name);
    const safeRole = escapeHtml(role);
    const safeCompany = escapeHtml(company);

    // Build subtitle for description (shown below name in WhatsApp preview)
    const subtitle = role && company ? `${safeRole} @ ${safeCompany}` : safeRole || safeCompany;
    const description = subtitle || "Digital Business Card";

    // FIXED: Title should be JUST the name (no role/company duplication)
    // WhatsApp shows: Title (bold) + Description (below)
    // So we want: "Nitesh Vohra" as title, "Founder & CEO @ Synka" as description
    const title = safeName;

    const ogImageUrl = photoUrl || DEFAULT_OG_IMAGE;
    const cardUrl = `https://synka.in/u/${slug}`;

    console.log(`[card-meta] Meta for slug=${slug}: title="${title}" desc="${description}" image=${ogImageUrl}`);

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${description}" />

<!-- Open Graph -->
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="Synka" />
<meta property="og:url" content="${cardUrl}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${ogImageUrl}" />
<meta property="og:image:secure_url" content="${ogImageUrl}" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="400" />
<meta property="og:image:height" content="400" />
<meta property="og:image:alt" content="${safeName}" />

<!-- Twitter (small image on left, text on right) -->
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${ogImageUrl}" />
<meta name="twitter:image:alt" content="${safeName}" />

<link rel="canonical" href="${cardUrl}" />
</head>
<body>Loading…</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...corsHeaders,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("[card-meta] Error:", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});

function escapeHtml(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
