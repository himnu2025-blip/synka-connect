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
      return new Response(JSON.stringify({ error: "Slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const subtitle = role && company ? `${role} @ ${company}` : role || company;
    const description = subtitle || "Digital Business Card";
    const title = subtitle ? `${name} — ${subtitle}` : name;
    const ogImageUrl = photoUrl || DEFAULT_OG_IMAGE;
    const cardUrl = `https://synka.in/u/${slug}`;

    const metaTags = {
      slug,
      profileFound: !!profile,
      meta: {
        title,
        description,
        ogImage: ogImageUrl,
        canonicalUrl: cardUrl,
        twitterCard: "summary",
        twitterImageAlt: name,
      },
      rawData: {
        name,
        role,
        company,
        photoUrl,
      },
    };

    return new Response(JSON.stringify(metaTags, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[card-meta-debug] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
