/** @jsxImportSource https://esm.sh/react@18.2.0 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.6/mod.ts";
import React from "https://esm.sh/react@18.2.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const DEFAULT_IMAGE_URL = "https://synka.in/og/default.png";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return Response.redirect(DEFAULT_IMAGE_URL, 302);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, photo_url")
      .eq("slug", slug)
      .maybeSingle();

    if (!profile) {
      return Response.redirect(DEFAULT_IMAGE_URL, 302);
    }

    // Fetch default card photo
    const { data: card } = await supabase
      .from("cards")
      .select("photo_url")
      .eq("user_id", profile.user_id)
      .eq("is_default", true)
      .maybeSingle();

    let photoUrl = card?.photo_url || profile.photo_url;

    // Skip WebP images (not supported by og_edge) and use initials instead
    if (photoUrl?.includes(".webp") || photoUrl?.endsWith(".webp")) {
      photoUrl = null;
    }

    const name = profile.full_name || "User";
    const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "?";

    // Generate 300x300 PNG for WhatsApp/iOS compatibility
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              width={260}
              height={260}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: "4px solid rgba(255, 122, 0, 0.8)",
              }}
            />
          ) : (
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ff7a00 0%, #ff9a40 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "4px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: "-2px",
                }}
              >
                {initials}
              </span>
            </div>
          )}
        </div>
      ),
      {
        width: 300,
        height: 300,
      }
    );

    // Add cache and CORS headers
    const response = new Response(imageResponse.body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        ...corsHeaders,
      },
    });

    return response;
  } catch (error) {
    console.error("OG image error:", error);
    return Response.redirect(DEFAULT_IMAGE_URL, 302);
  }
});
