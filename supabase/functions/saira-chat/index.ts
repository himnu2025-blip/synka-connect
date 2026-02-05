import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Exit phrases that definitively end the conversation (after "anything else?" was asked)
const FINAL_EXIT_PHRASES = [
  "no", "no thanks", "nothing", "that's all", "thats all", "done", "bye", 
  "exit", "goodbye", "thanks bye", "thank you bye", "no more", "nothing else",
  "i'm good", "im good", "all good", "nope", "that will be all", "all set",
  "no that's it", "no thats it", "nothing more", "no questions"
];

// Soft exit phrases that should trigger "anything else?" first
const SOFT_EXIT_PHRASES = [
  "ok thanks", "okay thanks", "ok thank you", "okay thank you", 
  "thanks", "thank you", "ty", "thx", "thanx", "thank u",
  "thanks a lot", "thanks so much", "much appreciated", "got it thanks",
  "alright thanks", "cool thanks", "great thanks", "perfect thanks"
];

function isFinalExitMessage(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return FINAL_EXIT_PHRASES.some(p => normalized === p || normalized.startsWith(p + " "));
}

function isSoftExitMessage(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return SOFT_EXIT_PHRASES.some(p => normalized === p || normalized.startsWith(p + " "));
}

// Intent detection for contextual follow-ups
function detectIntent(message: string): string {
  const text = message.toLowerCase();
  
  if (/metal\s*(card|nfc)?/.test(text)) return "metal_card";
  if (/nfc|pvc\s*card/.test(text)) return "nfc_card";
  if (/price|pricing|cost|₹|rupee|how much|rate/.test(text)) return "pricing";
  if (/replace|lost|damage|broken/.test(text)) return "replacement";
  if (/deliver|shipping|ship|when will|how long/.test(text)) return "delivery";
  if (/orange|plan|upgrade|premium|subscription/.test(text)) return "plans";
  if (/crm|contact|lead|manage/.test(text)) return "crm";
  if (/qr|scan|share|link/.test(text)) return "sharing";
  if (/design|custom|template|layout/.test(text)) return "design";
  if (/feature|what can|capability/.test(text)) return "features";
  
  return "general";
}

// Get contextual follow-up per intent (only asked once per intent)
function getIntentFollowUp(intent: string): string | null {
  const followUps: Record<string, string> = {
    metal_card: "Would you like to see available metal colors like rose gold or black?",
    nfc_card: "Do you want help choosing a design or should our AI design it for you?",
    pricing: "Should I explain what's included in each plan?",
    replacement: "Want me to explain how the replacement policy works?",
    delivery: "Would you like to know about express delivery options?",
    plans: "Would you like me to compare the Free and Orange plans for you?",
    crm: "Want to learn how to import your existing contacts?",
    sharing: "Should I explain the different ways to share your card?",
    design: "Would you like to see some design templates?",
    features: "Want me to highlight the most popular features?",
  };
  
  return followUps[intent] || null;
}

// ✅ FIX 2: Check if knowledge matches are confident enough
function isKnowledgeConfident(matches: any[]): boolean {
  if (!matches || matches.length === 0) return false;
  return (matches[0]?.similarity || 0) >= 0.6;
}

// Load bot configuration from database
async function loadBotConfig(supabase: any): Promise<{ personality: any; rules: any }> {
  const { data: configs } = await supabase
    .from("bot_config")
    .select("config_key, config_value")
    .in("config_key", ["personality", "rules"]);

  const personality = configs?.find((c: any) => c.config_key === "personality")?.config_value || {};
  const rules = configs?.find((c: any) => c.config_key === "rules")?.config_value || {};

  return { personality, rules };
}

// ✅ FIX 6: Faster keyword search first (no embedding generation needed)
async function searchKnowledgeByKeywords(
  supabase: any,
  query: string,
  limit = 5
): Promise<{ id: string; title: string; content: string; category: string; similarity: number }[]> {
  const keywords = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2);
  
  const topicKeywords: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  if (/price|pricing|cost|₹|rupee|how much|rate|plan/.test(lowerQuery)) {
    topicKeywords.push("pricing", "price", "plan", "orange", "cost", "monthly", "yearly");
  }
  if (/orange|premium|upgrade/.test(lowerQuery)) {
    topicKeywords.push("orange", "plan", "pricing", "subscription");
  }
  if (/monthly|yearly|annual|subscription/.test(lowerQuery)) {
    topicKeywords.push("pricing", "monthly", "yearly", "subscription", "plan");
  }
  if (/nfc|card|physical|metal|pvc/.test(lowerQuery)) {
    topicKeywords.push("nfc", "card", "physical", "metal", "pvc");
  }
  // Enhanced metal card detection
  if (/metal/.test(lowerQuery)) {
    topicKeywords.push("metal", "₹1499", "1499", "pricing");
  }
  // Enhanced PVC card detection
  if (/pvc/.test(lowerQuery)) {
    topicKeywords.push("pvc", "₹499", "499", "pricing");
  }
  if (/deliver|shipping|ship/.test(lowerQuery)) {
    topicKeywords.push("delivery", "shipping", "ship");
  }
  if (/replace|lost|damage/.test(lowerQuery)) {
    topicKeywords.push("replacement", "replace", "warranty");
  }
  
  const allKeywords = [...new Set([...keywords, ...topicKeywords])];
  const isPricingQuery = /price|pricing|cost|₹|rupee|how much|rate|plan|monthly|yearly|annual/.test(lowerQuery);
  
  if (allKeywords.length === 0) {
    return [];
  }

  const orConditions = allKeywords
    .slice(0, 6)
    .map(kw => `title.ilike.%${kw}%,content.ilike.%${kw}%`)
    .join(",");
  
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id, title, content, category")
    .eq("is_active", true)
    .or(orConditions)
    .limit(limit * 2);

  if (error) {
    console.error("Keyword search error:", error);
    return [];
  }

  const scored = (data || []).map((item: any) => {
    const text = `${item.title} ${item.content}`.toLowerCase();
    let score = 0;
    for (const kw of allKeywords) {
      if (text.includes(kw)) score += 1;
      if (item.title.toLowerCase().includes(kw)) score += 2;
    }

    // Extra confidence boost for pricing answers so we don't incorrectly fall back
    // when the KB has the exact price but the user's query doesn't include the same tokens (e.g., "price" vs "₹").
    if (isPricingQuery && item.category === "pricing") {
      score += 4;
    }
    if (isPricingQuery && item.title.toLowerCase().includes("pricing")) {
      score += 2;
    }

    // Convert score to similarity (0-1 range)
    const maxPossibleScore = allKeywords.length * 3;
    const similarity = Math.min(0.95, 0.5 + (score / maxPossibleScore) * 0.5);
    return { ...item, similarity };
  });

  return scored
    .filter((item: any) => item.similarity > 0.5)
    .sort((a: any, b: any) => b.similarity - a.similarity)
    .slice(0, limit);
}

// Load session memory
async function getSessionMemory(supabase: any, sessionId: string): Promise<any> {
  const { data } = await supabase
    .from("chat_session_memory")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  return data || null;
}

// Update session memory
async function updateSessionMemory(
  supabase: any,
  sessionId: string,
  userMessage: string,
  assistantResponse: string,
  intent: string,
  followupsDone: string[]
): Promise<void> {
  const memory = await getSessionMemory(supabase, sessionId);
  
  const currentIntents = memory?.detected_intents || [];
  const newIntents = [...new Set([...currentIntents, intent])].slice(-10);
  
  const prevSummary = memory?.conversation_summary || "";
  const newSummary = prevSummary 
    ? `${prevSummary}\nUser asked: ${userMessage.slice(0, 100)}`
    : `User asked: ${userMessage.slice(0, 100)}`;

  await supabase
    .from("chat_session_memory")
    .upsert({
      session_id: sessionId,
      last_user_message: userMessage,
      last_assistant_response: assistantResponse.slice(0, 500),
      message_count: (memory?.message_count || 0) + 1,
      detected_intents: newIntents,
      conversation_summary: newSummary.slice(-1000),
      updated_at: new Date().toISOString(),
      last_intent: intent,
      followups_done: followupsDone,
      // Clear pending followup when user sends a new message
      pending_followup: null,
    }, { onConflict: "session_id" });
}

// Check if message is meaningful for learning signals
function isMeaningfulQuestion(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  
  if (normalized.length < 3) return false;
  
  const emojiPattern = /^[\p{Emoji}\s]+$/u;
  if (emojiPattern.test(message.trim())) return false;
  
  const nonMeaningfulPatterns = [
    /^(yes|yeah|yep|yup|ya|yea|sure|ok|okay|k|kk|alright|right|correct|exactly|absolutely|definitely)$/,
    /^(no|nope|nah|na|not really|no thanks|no thank you|nothing|none|neither)$/,
    /^(thanks|thank you|ty|thx|thanx|thank u|thanks a lot|thanks so much|much appreciated)$/,
    /^(hi|hello|hey|hiya|howdy|yo|sup|hola|good morning|good afternoon|good evening|gm|morning)$/,
    /^(bye|goodbye|see you|see ya|cya|later|take care|cheers|ttyl|talk later)$/,
    /^(got it|understood|i see|i understand|makes sense|cool|great|nice|awesome|perfect|good|fine|sounds good)$/,
    /^(that's all|thats all|that's it|i'm good|im good|all good|no more|nothing else|all set)$/,
    /^(ok thanks|okay thanks|alright thanks|got it thanks|sure thanks|yes thanks|great thanks)$/,
    /^(hmm|hm|uh|um|oh|ah|wow|ooh|aah|lol|haha|hehe|nice|interesting)$/,
  ];
  
  for (const pattern of nonMeaningfulPatterns) {
    if (pattern.test(normalized)) return false;
  }
  
  const strippedPunctuation = normalized.replace(/[^\w\s]/g, "").trim();
  if (strippedPunctuation.length < 3) return false;
  
  const wordCount = strippedPunctuation.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 2) {
    const topicPatterns = /^(pricing|price|plans|features|nfc|cards|crm|upgrade|support|help|contact|demo|trial)$/;
    if (!topicPatterns.test(normalized)) return false;
  }
  
  return true;
}

// Record learning signal
async function recordLearningSignal(
  supabase: any,
  sessionId: string,
  queryText: string,
  queryEmbedding: number[] | null,
  matchedKnowledgeId: string | null,
  similarityScore: number | null,
  responseText: string,
  signalType: string
): Promise<void> {
  try {
    const normalizedQuery = queryText.trim().toLowerCase();
    const { data: exactMatch } = await supabase
      .from("chat_learning_signals")
      .select("id, frequency_count, query_text")
      .ilike("query_text", normalizedQuery)
      .in("status", ["new", "reviewed"])
      .limit(1)
      .single();

    if (exactMatch) {
      const newCount = (exactMatch.frequency_count || 1) + 1;
      await supabase
        .from("chat_learning_signals")
        .update({
          frequency_count: newCount,
          signal_type: signalType === "no_match" ? "repeated_query" : signalType,
          response_text: responseText.slice(0, 500),
        })
        .eq("id", exactMatch.id);
    } else {
      await supabase.from("chat_learning_signals").insert({
        session_id: sessionId,
        query_text: queryText,
        query_embedding: queryEmbedding,
        matched_knowledge_id: matchedKnowledgeId,
        similarity_score: similarityScore,
        response_text: responseText.slice(0, 500),
        signal_type: signalType,
        frequency_count: 1,
        status: "new",
      });
    }
  } catch (e) {
    console.error("Failed to record learning signal:", e);
  }
}

// Build system prompt - NO repetitive follow-up instructions
function buildSystemPrompt(
  personality: any,
  rules: any,
  knowledgeContext: string,
  sessionMemory: any,
  firstName: string,
  isExistingUser: boolean
): string {
  const styleRules = personality.style?.join("\n- ") || "";
  const rulesList = rules.rules?.join("\n- ") || "";

  let prompt = `You are ${personality.name || "Saira"}, ${personality.company || "Synka"}'s ${personality.role || "AI assistant"}.

YOUR PERSONALITY:
- ${personality.tone || "Warm, natural, and conversational like WhatsApp chat"}
- ${styleRules}

CRITICAL RULES:
- ${rulesList}
- NEVER say "Is there anything else I can help you with?" or similar generic follow-ups
- NEVER repeat the user's name after the initial greeting
- Give direct, concise answers
- STRICTLY use ONLY the information from the RELEVANT KNOWLEDGE section below for specific facts like prices, features, plans
- For pricing questions: ONLY quote exact prices from the knowledge base. Do NOT make up or estimate prices.
- If the knowledge base doesn't have specific information, say "I don't have that information right now, but our team can help at support@synka.in"
- Use conversational, casual tone like texting a helpful friend`;

  if (knowledgeContext) {
    prompt += `\n\nRELEVANT KNOWLEDGE (use this to answer accurately):\n${knowledgeContext}`;
  }

  if (sessionMemory?.conversation_summary) {
    prompt += `\n\nCONVERSATION CONTEXT:\n${sessionMemory.conversation_summary}`;
  }

  if (firstName && isExistingUser) {
    prompt += `\n\nNOTE: User is "${firstName}", an existing Synka user. Don't repeat their name in responses.`;
  }

  prompt += `\n\nIf unsure: "${personality.fallback_message || "I'm not sure about that, but our team at support@synka.in can help!"}"`;

  return prompt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, messages, sessionId, userInfo } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ✅ FIX 4: Idle check action for frontend polling
    if (action === "idle_check") {
      const memory = await getSessionMemory(supabase, sessionId);

      if (!memory?.pending_followup) {
        return new Response(
          JSON.stringify({ send: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expiresAt = new Date(memory.pending_followup.expires_at);
      if (expiresAt < new Date()) {
        // Time expired → send follow-up
        await supabase
          .from("chat_session_memory")
          .update({ pending_followup: null })
          .eq("session_id", sessionId);

        console.log(`Sending delayed follow-up for session ${sessionId}: ${memory.pending_followup.intent}`);

        return new Response(
          JSON.stringify({
            send: true,
            message: memory.pending_followup.question,
            intent: memory.pending_followup.intent,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ send: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Regular chat flow
    const firstName = userInfo?.firstName || userInfo?.name?.split(" ")[0] || "";
    const isExistingUser = userInfo?.isExistingUser || false;

    console.log(`Chat request for session ${sessionId}, user: ${firstName || "anonymous"}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user's latest message
    const userMessages = messages.filter((m: any) => m.role === "user");
    const latestUserMessage = userMessages[userMessages.length - 1]?.content || "";

    // Get session memory
    const sessionMemory = await getSessionMemory(supabase, sessionId);

    // Check if session was already ended
    if (sessionMemory?.ended) {
      return new Response(
        JSON.stringify({ reply: null, sessionEnded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we already asked "anything else?" - then treat soft exit as final
    const askedAnythingElse = sessionMemory?.context_data?.asked_anything_else || false;
    
    // SOFT EXIT DETECTION - "ok thanks" etc.
    if (isSoftExitMessage(latestUserMessage)) {
      // If we already asked "anything else?", user saying "ok thanks" again means end the chat
      if (askedAnythingElse) {
        const goodbyeResponse = "Alright 😊 If you need anything later, I'm here. Have a great day!";

        // End session in DB
        await supabase
          .from("chat_sessions")
          .update({ status: "ended", ended_at: new Date().toISOString(), timeout_reason: "user_exit" })
          .eq("session_id", sessionId);

        // Mark memory as ended and clear pending followup
        await supabase
          .from("chat_session_memory")
          .update({ ended: true, pending_followup: null, context_data: null })
          .eq("session_id", sessionId);

        console.log(`Session ${sessionId} ended: soft exit after "anything else?" was asked`);

        return new Response(
          JSON.stringify({ reply: goodbyeResponse, sessionEnded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // First time soft exit → ask "anything else?"
      const anythingElseResponse = "You're welcome! 😊 Is there anything else I can help you with?";
      
      // Mark that we've asked "anything else?" - store in memory
      await supabase
        .from("chat_session_memory")
        .update({ 
          pending_followup: null,
          context_data: { asked_anything_else: true }
        })
        .eq("session_id", sessionId);

      console.log(`Session ${sessionId}: soft exit detected, asking "anything else?"`);

      return new Response(
        JSON.stringify({ reply: anythingElseResponse }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FINAL EXIT DETECTION - "no", "done", "bye" etc. → end session with goodbye
    if (isFinalExitMessage(latestUserMessage)) {
      const goodbyeResponse = "Alright 😊 If you need anything later, I'm here. Have a great day!";

      // End session in DB
      await supabase
        .from("chat_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString(), timeout_reason: "user_exit" })
        .eq("session_id", sessionId);

      // Mark memory as ended and clear pending followup
      await supabase
        .from("chat_session_memory")
        .update({ ended: true, pending_followup: null, context_data: null })
        .eq("session_id", sessionId);

      console.log(`Session ${sessionId} ended: final exit phrase detected`);

      return new Response(
        JSON.stringify({ reply: goodbyeResponse, sessionEnded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear "asked_anything_else" if user asks a new question (continuing conversation)
    if (askedAnythingElse && isMeaningfulQuestion(latestUserMessage)) {
      await supabase
        .from("chat_session_memory")
        .update({ context_data: { asked_anything_else: false } })
        .eq("session_id", sessionId);
    }

    // Load bot configuration
    const { personality, rules } = await loadBotConfig(supabase);

    // Detect intent for this message
    const intent = detectIntent(latestUserMessage);
    console.log(`Detected intent: ${intent}`);

    // ✅ FIX 6: FAST PATH - keyword search first (no embedding generation latency)
    let knowledgeContext = "";
    let matchedKnowledge: any[] = [];

    if (latestUserMessage) {
      // Fast keyword search first
      matchedKnowledge = await searchKnowledgeByKeywords(supabase, latestUserMessage, 5);
      console.log(`Keyword search found ${matchedKnowledge.length} results`);

      if (matchedKnowledge.length > 0) {
        knowledgeContext = matchedKnowledge
          .map((k) => `[${k.title}]: ${k.content}`)
          .join("\n\n");
        console.log(`Found ${matchedKnowledge.length} relevant knowledge entries`);
      }
    }

    // ✅ FIX 5: If no KB match → polite fallback ONLY (no LLM hallucination)
    if (!isKnowledgeConfident(matchedKnowledge) && isMeaningfulQuestion(latestUserMessage)) {
      const fallback = "I don't have the right information on this yet. Our team will get back to you shortly — you can also reach us at support@synka.in! 🙏";

      await recordLearningSignal(
        supabase,
        sessionId,
        latestUserMessage,
        null,
        null,
        null,
        fallback,
        "no_match"
      );

      // Update memory
      await updateSessionMemory(supabase, sessionId, latestUserMessage, fallback, intent, sessionMemory?.followups_done || []);

      console.log(`No confident KB match for: "${latestUserMessage}" - returning polite fallback`);

      return new Response(
        JSON.stringify({ reply: fallback }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt (no generic follow-ups!)
    const systemPrompt = buildSystemPrompt(
      personality,
      rules,
      knowledgeContext,
      sessionMemory,
      firstName,
      isExistingUser
    );

    // Prepare conversation messages
    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messages
        .filter((msg: any) => msg.role !== "system")
        .map((msg: any) => ({ role: msg.role, content: msg.content })),
    ];

    // Call LLM
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (latestUserMessage && isMeaningfulQuestion(latestUserMessage)) {
        await recordLearningSignal(
          supabase, sessionId, latestUserMessage, null,
          matchedKnowledge[0]?.id || null, matchedKnowledge[0]?.similarity || null,
          "Error: AI gateway failed", "low_confidence"
        );
      }

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Busy right now! Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream response - ✅ FIX 1: NO immediate follow-up in stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body!.getReader();
    let fullResponse = "";
    const encoder = new TextEncoder();

    // Get current followups done
    const followupsDone: string[] = sessionMemory?.followups_done || [];

    (async () => {
      try {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          await writer.write(value);

          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch { /* ignore */ }
            }
          }
        }
      } catch (e) {
        console.error("Stream processing error:", e);
      } finally {
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();

        // ✅ FIX 3: Save follow-up as PENDING, don't send immediately
        const intentFollowUp = getIntentFollowUp(intent);
        const newFollowupsDone = [...followupsDone];
        
        if (
          intent !== "general" &&
          isKnowledgeConfident(matchedKnowledge) &&
          intentFollowUp &&
          !followupsDone.includes(intent)
        ) {
          // Save as pending - will be sent after 60s idle
          await supabase
            .from("chat_session_memory")
            .update({
              pending_followup: {
                intent,
                question: intentFollowUp,
                expires_at: new Date(Date.now() + 60_000).toISOString(), // 60 seconds
              },
              followups_done: [...followupsDone, intent],
            })
            .eq("session_id", sessionId);
          
          newFollowupsDone.push(intent);
          console.log(`Saved pending follow-up for intent: ${intent} (60s delay)`);
        }

        // Update session memory
        if (latestUserMessage && fullResponse) {
          await updateSessionMemory(
            supabase, sessionId, latestUserMessage, fullResponse, intent, newFollowupsDone
          );
        }
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("saira-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
