import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a deterministic hash-based embedding for text
// This creates a consistent 768-dimension vector based on the text content
function generateHashEmbedding(text: string): number[] {
  const embedding: number[] = [];
  const normalized = text.toLowerCase().trim();
  
  // Create 768 dimensions based on character patterns
  for (let i = 0; i < 768; i++) {
    let value = 0;
    const offset = i * 3;
    
    for (let j = 0; j < normalized.length; j++) {
      const charCode = normalized.charCodeAt(j);
      // Use different prime multipliers for variety
      value += Math.sin(charCode * (i + 1) * 0.01 + offset * 0.001) * 
               Math.cos((j + 1) * (i + 1) * 0.005);
    }
    
    // Normalize to -1 to 1 range
    embedding.push(Math.tanh(value / Math.max(1, normalized.length * 0.1)));
  }
  
  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
}

// Generate embedding using semantic hashing with keyword boosting
function generateEmbedding(text: string): number[] {
  const embedding = generateHashEmbedding(text);
  
  // Boost specific dimensions based on keywords for better semantic matching
  const keywordBoosts: Record<string, number[]> = {
    'price': [0, 1, 2],
    'pricing': [0, 1, 2],
    'cost': [0, 1, 2],
    'monthly': [3, 4, 5],
    'yearly': [6, 7, 8],
    'annual': [6, 7, 8],
    'orange': [9, 10, 11],
    'plan': [12, 13, 14],
    'upgrade': [15, 16, 17],
    'card': [18, 19, 20],
    'nfc': [21, 22, 23],
    'metal': [24, 25, 26],
    'contact': [27, 28, 29],
    'share': [30, 31, 32],
    'qr': [33, 34, 35],
    'email': [36, 37, 38],
    'signature': [39, 40, 41],
    'dashboard': [42, 43, 44],
    'crm': [45, 46, 47],
    'event': [48, 49, 50],
    'support': [51, 52, 53],
    'help': [51, 52, 53],
  };
  
  const lowerText = text.toLowerCase();
  for (const [keyword, dims] of Object.entries(keywordBoosts)) {
    if (lowerText.includes(keyword)) {
      for (const dim of dims) {
        embedding[dim] = Math.min(1, embedding[dim] + 0.3);
      }
    }
  }
  
  return embedding;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { record_id, regenerate_all } = body;

    let entriesToProcess: any[] = [];

    if (regenerate_all) {
      // Regenerate embeddings for ALL active entries
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("id, title, content")
        .eq("is_active", true);

      if (error) throw error;
      entriesToProcess = data || [];
      console.log(`Regenerating embeddings for ${entriesToProcess.length} entries`);
    } else if (record_id) {
      // Generate embedding for a specific record
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("id, title, content")
        .eq("id", record_id)
        .single();

      if (error) throw error;
      if (data) entriesToProcess = [data];
    } else {
      // Generate for all entries missing embeddings
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("id, title, content")
        .eq("is_active", true)
        .is("embedding", null);

      if (error) throw error;
      entriesToProcess = data || [];
      console.log(`Found ${entriesToProcess.length} entries missing embeddings`);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const entry of entriesToProcess) {
      const textToEmbed = `${entry.title}\n\n${entry.content}`;
      const embedding = generateEmbedding(textToEmbed);

      const { error: updateError } = await supabase
        .from("knowledge_base")
        .update({ 
          embedding: JSON.stringify(embedding),
          updated_at: new Date().toISOString()
        })
        .eq("id", entry.id);

      if (updateError) {
        console.error(`Failed to update embedding for ${entry.id}:`, updateError);
        errorCount++;
      } else {
        console.log(`Generated embedding for: ${entry.title}`);
        successCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: entriesToProcess.length,
        successCount,
        errorCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
