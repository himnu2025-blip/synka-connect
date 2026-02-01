import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, RotateCcw, User, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UserInfo {
  name: string;
  email: string;
  mobile: string;
  isExistingUser: boolean;
}

interface ChatSession {
  sessionId: string;
  userInfo: UserInfo;
  detailsCaptured: boolean;
}

const STORAGE_KEY = "synka_chat_session";
const MESSAGES_STORAGE_KEY = "synka_chat_messages";
const LAST_ACTIVITY_KEY = "synka_chat_last_activity";
const SESSION_CREATED_KEY = "synka_chat_session_created";
const GOODBYE_SENT_KEY = "synka_chat_goodbye_sent";
const SHOW_FORM_KEY = "synka_chat_show_form";
const BOT_MESSAGES_KEY = "synka_bot_messages";
const WARNING_TIMEOUT_MS = 60000;
const END_TIMEOUT_MS = 120000;
const IDLE_CHECK_INTERVAL_MS = 10000; // Check for pending follow-ups every 10 seconds

// Backend URLs
const CHAT_URL = "https://qlrnewbkolxjdtfffuml.supabase.co/functions/v1/saira-chat";
const SESSION_URL = "https://qlrnewbkolxjdtfffuml.supabase.co/functions/v1/saira-session";

// Bot messages interface - loaded from backend (NO FALLBACK ANSWERS)
interface BotMessages {
  welcome: string;
  form_intro: string;
  warning: string;
  goodbye_with_name: string;
  goodbye: string;
  follow_up: string;
  error: string;
  greeting_existing: string;
  greeting_new: string;
}

// Zod schema for identity form
const identitySchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    mobile: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.email || data.mobile, {
    message: "Email or mobile is required",
    path: ["email"],
  });

type IdentityFormData = z.infer<typeof identitySchema>;

const hasGoodbyeBeenSent = (): boolean => {
  return localStorage.getItem(GOODBYE_SENT_KEY) === "true";
};

const getFirstName = (name: string): string => {
  if (!name) return "";
  return name.split(" ")[0];
};

// Returns null if not cached - NO FALLBACK
const loadBotMessages = (): BotMessages | null => {
  try {
    const stored = localStorage.getItem(BOT_MESSAGES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

const saveBotMessages = (messages: BotMessages) => {
  try {
    localStorage.setItem(BOT_MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    // Ignore storage errors
  }
};

const loadSession = (): ChatSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

const loadMessages = (): Message[] => {
  try {
    const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    }
  } catch {
    // Ignore parse errors
  }
  return [];
};

const saveSession = (session: ChatSession) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors
  }
};

const saveMessages = (messages: Message[]) => {
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Ignore storage errors
  }
};

const saveLastActivity = () => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {
    // Ignore errors
  }
};

const getLastActivity = (): number => {
  try {
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (stored) return parseInt(stored, 10);
  } catch {
    // Ignore errors
  }
  return Date.now();
};

const isSessionCreatedInDB = (): boolean => {
  try {
    return localStorage.getItem(SESSION_CREATED_KEY) === "true";
  } catch {
    return false;
  }
};

const markSessionCreatedInDB = () => {
  try {
    localStorage.setItem(SESSION_CREATED_KEY, "true");
  } catch {
    // Ignore errors
  }
};

const SESSION_ENDED_KEY = "synka_chat_session_ended";

const clearSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MESSAGES_STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(SESSION_CREATED_KEY);
    localStorage.removeItem(GOODBYE_SENT_KEY);
    localStorage.removeItem(SESSION_ENDED_KEY);
    localStorage.removeItem(SHOW_FORM_KEY);
  } catch {
    // Ignore errors
  }
};

const markSessionEnded = () => {
  try {
    localStorage.setItem(SESSION_ENDED_KEY, "true");
  } catch {
    // Ignore errors
  }
};

const isSessionEnded = (): boolean => {
  try {
    return localStorage.getItem(SESSION_ENDED_KEY) === "true";
  } catch {
    return false;
  }
};

export function SairaChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(() => isSessionEnded());
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const [awaitingClosureConfirmation, setAwaitingClosureConfirmation] = useState(false);
  const [botMessagesLoaded, setBotMessagesLoaded] = useState(() => loadBotMessages() !== null);
  
  // Bot messages loaded from backend - NULL until loaded (NO FALLBACK)
  const botMessagesRef = useRef<BotMessages | null>(loadBotMessages());

  const [session, setSession] = useState<ChatSession>(() => {
    const existing = loadSession();
    if (existing) {
      return existing;
    }
    return {
      sessionId: crypto.randomUUID(),
      userInfo: { name: "", email: "", mobile: "", isExistingUser: false },
      detailsCaptured: false,
    };
  });

  // Fetch bot messages from backend on mount - REQUIRED before showing content
  useEffect(() => {
    const fetchBotMessages = async () => {
      try {
        const response = await fetch(SESSION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_messages" }),
        });
        const result = await response.json();
        if (result.success && result.messages) {
          botMessagesRef.current = result.messages;
          saveBotMessages(result.messages);
          setBotMessagesLoaded(true);
        } else {
          console.error("Failed to load bot messages from backend");
        }
      } catch (e) {
        console.error("Failed to fetch bot messages:", e);
      }
    };
    fetchBotMessages();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<IdentityFormData>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
    },
  });

  const lastUserMessageTime = useRef<number>(getLastActivity());
  const warningShownRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionEndedRef = useRef(false);
  const goodbyeSentRef = useRef(false);
  const sessionCreatedInDBRef = useRef(isSessionCreatedInDB());
  const streamingMessageIdRef = useRef<string | null>(null);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Create session in DB via edge function
  const createSessionInDB = async (sessionSnapshot: ChatSession, userInfo: UserInfo) => {
    if (sessionCreatedInDBRef.current) return { isExistingUser: userInfo.isExistingUser };

    try {
      const response = await fetch(SESSION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          sessionId: sessionSnapshot.sessionId,
          userInfo: {
            name: userInfo.name,
            email: userInfo.email,
            mobile: userInfo.mobile,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        sessionCreatedInDBRef.current = true;
        markSessionCreatedInDB();
        return { 
          isExistingUser: result.isExistingUser, 
          existingUserName: result.existingUserName,
          greetingMessage: result.greetingMessage,
        };
      } else {
        console.error("Session create error:", result.error);
        return { isExistingUser: false };
      }
    } catch (e) {
      console.error("Error creating session:", e);
      return { isExistingUser: false };
    }
  };

  // End session via edge function
  const endSessionInDB = async (sessionId: string, reason: string) => {
    try {
      await fetch(SESSION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", sessionId, reason }),
        keepalive: true,
      });
    } catch (e) {
      console.error("Error ending session:", e);
    }
  };

  // Save message to DB
  const saveMessageToDB = async (sessionId: string, role: "user" | "assistant", content: string) => {
    if (!sessionCreatedInDBRef.current) return;
    try {
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        role,
        content,
      });
    } catch (e) {
      console.error("Error saving message:", e);
    }
  };

  // Stop inactivity timer
  const stopInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // Stop idle check timer
  const stopIdleCheckTimer = useCallback(() => {
    if (idleCheckTimerRef.current) {
      clearInterval(idleCheckTimerRef.current);
      idleCheckTimerRef.current = null;
    }
  }, []);

  // ✅ FIX 4: Check for pending follow-ups from backend (idle-based)
  const checkPendingFollowUp = useCallback(async () => {
    if (sessionEndedRef.current || !session.detailsCaptured || !sessionCreatedInDBRef.current) return;
    
    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFscm5ld2Jrb2x4amR0ZmZmdW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNjAzMDMsImV4cCI6MjA4MDkzNjMwM30.3oTFUgh8RdxzRu69FHPd5bjzYSwbQhGesdi6ynopQMk`,
        },
        body: JSON.stringify({
          action: "idle_check",
          sessionId: session.sessionId,
        }),
      });

      const result = await response.json();
      
      if (result.send && result.message) {
        console.log(`Received delayed follow-up for intent: ${result.intent}`);
        
        const followUpMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.message,
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, followUpMsg]);
        await saveMessageToDB(session.sessionId, "assistant", result.message);
      }
    } catch (e) {
      // Silently fail - don't interrupt user experience
      console.error("Idle check error:", e);
    }
  }, [session.sessionId, session.detailsCaptured]);

  // Start idle check polling
  const startIdleCheckTimer = useCallback(() => {
    stopIdleCheckTimer();
    idleCheckTimerRef.current = setInterval(checkPendingFollowUp, IDLE_CHECK_INTERVAL_MS);
  }, [checkPendingFollowUp, stopIdleCheckTimer]);

  // End session - gets goodbye from backend
  const endSession = useCallback(
    async (reason: string, sessionSnapshot: ChatSession, showGoodbye: boolean = true) => {
      if (sessionEndedRef.current) return;
      sessionEndedRef.current = true;

      stopInactivityTimer();
      stopIdleCheckTimer(); // Stop checking for follow-ups when session ends

      if (showGoodbye && !goodbyeSentRef.current && !hasGoodbyeBeenSent()) {
        goodbyeSentRef.current = true;
        localStorage.setItem(GOODBYE_SENT_KEY, "true");

        // Get goodbye message from backend
        try {
          const response = await fetch(SESSION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "end",
              sessionId: sessionSnapshot.sessionId,
              userInfo: sessionSnapshot.userInfo,
              reason,
            }),
          });
          const result = await response.json();
          
          // Backend MUST return goodbye - no fallback
          const goodbyeMessage = result.goodbyeMessage;
          if (!goodbyeMessage) {
            console.error("Backend did not return goodbye message");
          }
          
          if (goodbyeMessage) {
            const goodbyeMsg: Message = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: goodbyeMessage,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, goodbyeMsg]);
            await saveMessageToDB(sessionSnapshot.sessionId, "assistant", goodbyeMessage);
          }
        } catch (e) {
          console.error("Error ending session:", e);
        }
      } else {
        await endSessionInDB(sessionSnapshot.sessionId, reason);
      }

      setSessionEnded(true);
      markSessionEnded();
    },
    [stopInactivityTimer, stopIdleCheckTimer]
  );

  // Start new session - requires backend messages
  const startNewSession = useCallback(() => {
    clearSession();

    sessionEndedRef.current = false;
    goodbyeSentRef.current = false;
    warningShownRef.current = false;
    sessionCreatedInDBRef.current = false;
    reset();

    const newSession: ChatSession = {
      sessionId: crypto.randomUUID(),
      userInfo: { name: "", email: "", mobile: "", isExistingUser: false },
      detailsCaptured: false,
    };

    setSession(newSession);
    setSessionEnded(false);
    setShowForm(false);
    setHasUserSentMessage(false);
    setAwaitingClosureConfirmation(false);

    // Only show welcome if bot messages are loaded from backend
    if (botMessagesRef.current?.welcome) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: botMessagesRef.current.welcome,
          timestamp: new Date(),
        },
      ]);
    } else {
      // Show loading state - no fallback
      setMessages([]);
    }
  }, [reset]);

  // Handle Start Chat button click
  const handleStartChat = useCallback(() => {
    if (!botMessagesRef.current?.form_intro) {
      console.error("Bot messages not loaded");
      return;
    }
    setShowForm(true);
    localStorage.setItem(SHOW_FORM_KEY, "true");
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: botMessagesRef.current!.form_intro,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Show inactivity warning - uses backend message
  const showInactivityWarning = useCallback(async (sessionSnapshot: ChatSession) => {
    if (warningShownRef.current || sessionEndedRef.current || goodbyeSentRef.current) return;
    if (!botMessagesRef.current?.warning) {
      console.error("Warning message not loaded from backend");
      return;
    }
    warningShownRef.current = true;

    const warningContent = botMessagesRef.current.warning;
    const warningMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: warningContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, warningMsg]);
    await saveMessageToDB(sessionSnapshot.sessionId, "assistant", warningContent);
  }, []);

  // Check inactivity
  const checkInactivity = useCallback(async () => {
    if (sessionEndedRef.current || !session.detailsCaptured || !hasUserSentMessage) return;

    const now = Date.now();
    const timeSinceLastMessage = now - lastUserMessageTime.current;
    const sessionSnapshot = { ...session };

    if (timeSinceLastMessage >= END_TIMEOUT_MS) {
      await endSession("No response after warning", sessionSnapshot);
      return;
    }

    if (timeSinceLastMessage >= WARNING_TIMEOUT_MS && !warningShownRef.current) {
      showInactivityWarning(sessionSnapshot);
    }
  }, [session, endSession, showInactivityWarning, hasUserSentMessage]);

  // Inactivity timer effect
  useEffect(() => {
    if (!session.detailsCaptured || sessionEndedRef.current) {
      stopInactivityTimer();
      stopIdleCheckTimer();
      return;
    }

    const lastActivity = getLastActivity();
    const timeSinceActivity = Date.now() - lastActivity;

    if (timeSinceActivity >= END_TIMEOUT_MS) {
      const sessionSnapshot = { ...session };
      (async () => {
        await endSession("Session timeout while inactive", sessionSnapshot);
      })();
      return;
    }

    stopInactivityTimer();
    inactivityTimerRef.current = setInterval(checkInactivity, 5000);
    
    // ✅ FIX 4: Start idle check polling for delayed follow-ups
    startIdleCheckTimer();

    return () => {
      stopInactivityTimer();
      stopIdleCheckTimer();
    };
  }, [session, checkInactivity, endSession, stopInactivityTimer, stopIdleCheckTimer, startIdleCheckTimer]);

  // Save state on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session.sessionId) {
        saveSession(session);
        if (messages.length > 0) {
          saveMessages(messages);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [session, messages]);

  // Initialize messages from cache
  useEffect(() => {
    const initializeMessages = async () => {
      if (isInitialized) return;
      setIsInitialized(true);

      const wasSessionEnded = isSessionEnded();
      
      if (wasSessionEnded) {
        clearSession();
        sessionEndedRef.current = false;
        setSessionEnded(false);
        setShowForm(false);
        setHasUserSentMessage(false);
        setAwaitingClosureConfirmation(false);
        // Only show welcome if loaded from backend
        if (botMessagesRef.current?.welcome) {
          setMessages([
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: botMessagesRef.current.welcome,
              timestamp: new Date(),
            },
          ]);
        }
        return;
      }

      const cachedSession = loadSession();
      const cachedMessages = loadMessages();
      const goodbyeSent = localStorage.getItem(GOODBYE_SENT_KEY) === "true";
      const wasShowingForm = localStorage.getItem(SHOW_FORM_KEY) === "true";
      goodbyeSentRef.current = goodbyeSent;

      if (cachedSession) {
        setSession(cachedSession);
        sessionCreatedInDBRef.current = isSessionCreatedInDB();
        sessionEndedRef.current = false;
        
        if (!cachedSession.detailsCaptured) {
          setShowForm(wasShowingForm);
          if (cachedSession.userInfo) {
            setValue("name", cachedSession.userInfo.name || "");
            setValue("email", cachedSession.userInfo.email || "");
            setValue("mobile", cachedSession.userInfo.mobile || "");
          }
        }
      }

      if (cachedMessages.length > 0) {
        setMessages(cachedMessages);
        const hasUserMsg = cachedMessages.some((m) => m.role === "user");
        if (hasUserMsg) {
          lastUserMessageTime.current = getLastActivity();
          setHasUserSentMessage(true);
        }
        return;
      }

      if (cachedSession?.sessionId && isSessionCreatedInDB()) {
        const { data: dbMessages } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", cachedSession.sessionId)
          .order("created_at", { ascending: true });

        if (dbMessages && dbMessages.length > 0) {
          const loadedMsgs = dbMessages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.created_at),
          }));
          setMessages(loadedMsgs);
          saveMessages(loadedMsgs);
          const hasUserMsg = loadedMsgs.some((m) => m.role === "user");
          if (hasUserMsg) {
            setHasUserSentMessage(true);
          }
          return;
        }
      }

      // No messages - show welcome only if backend loaded
      if (botMessagesRef.current?.welcome) {
        setMessages([
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: botMessagesRef.current.welcome,
            timestamp: new Date(),
          },
        ]);
      }
    };

    initializeMessages();
  }, [isInitialized, setValue]);

  // Save session locally
  useEffect(() => {
    if (isOpen) {
      saveSession(session);
    }
  }, [isOpen, session]);

  // Auto-scroll and persist messages
  useEffect(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current && session.detailsCaptured && !sessionEnded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, session.detailsCaptured, sessionEnded]);

  // Stream chat - UI layer only, ALL intelligence on backend
  // Backend handles: goodbye detection, closure confirmation, follow-up, all answers
  const streamChat = async (
    userMessage: string, 
    currentUserInfo: UserInfo, 
    sessionId: string,
    isAwaitingClosure: boolean
  ): Promise<{ content: string; followUp?: string; sessionEnded?: boolean }> => {
    const conversationMessages = messages
      .filter((m) => m.role !== "assistant" || !m.content.includes("I'm Saira"))
      .concat({ id: "", role: "user" as const, content: userMessage, timestamp: new Date() })
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFscm5ld2Jrb2x4amR0ZmZmdW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNjAzMDMsImV4cCI6MjA4MDkzNjMwM30.3oTFUgh8RdxzRu69FHPd5bjzYSwbQhGesdi6ynopQMk`,
      },
      body: JSON.stringify({
        messages: conversationMessages,
        sessionId,
        awaitingClosureConfirmation: isAwaitingClosure,
        userInfo: {
          ...currentUserInfo,
          firstName: getFirstName(currentUserInfo.name),
        },
      }),
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to get response");
    }

    // Check if this is a JSON response (goodbye/closure) vs SSE stream
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const jsonResult = await response.json();
      return { 
        content: jsonResult.reply || "", 
        sessionEnded: jsonResult.sessionEnded || false 
      };
    }

    // Handle SSE stream for regular chat
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = "";
    let buffer = "";
    let followUpMessage: string | undefined;

    const streamingId = "streaming-" + crypto.randomUUID();
    streamingMessageIdRef.current = streamingId;

    setMessages((prev) => [
      ...prev,
      {
        id: streamingId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          
          // Check for backend meta (follow-up message)
          if (parsed.synka_meta?.followUp) {
            followUpMessage = parsed.synka_meta.followUp;
            continue;
          }
          
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setMessages((prev) => prev.map((m) => (m.id === streamingId ? { ...m, content: assistantContent } : m)));
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    const finalId = crypto.randomUUID();
    setMessages((prev) => prev.map((m) => (m.id === streamingId ? { ...m, id: finalId } : m)));
    streamingMessageIdRef.current = null;

    return { content: assistantContent, followUp: followUpMessage };
  };

  // handleSend - ALL message handling delegated to backend
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !session.detailsCaptured) return;

    if (sessionEndedRef.current) {
      startNewSession();
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    const currentAwaitingClosure = awaitingClosureConfirmation;
    setAwaitingClosureConfirmation(false);

    const sessionSnapshot = { ...session };
    const sessionId = sessionSnapshot.sessionId;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    lastUserMessageTime.current = Date.now();
    saveLastActivity();
    warningShownRef.current = false;
    setHasUserSentMessage(true);

    await saveMessageToDB(sessionId, "user", userMessage);

    try {
      // Backend handles ALL decisions: goodbye, closure, follow-up, answers
      const result = await streamChat(userMessage, sessionSnapshot.userInfo, sessionId, currentAwaitingClosure);
      
      // If backend says session ended (goodbye or closure confirmed)
      if (result.sessionEnded) {
        // Display the goodbye message from backend
        if (result.content) {
          const goodbyeMsg: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.content,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, goodbyeMsg]);
          await saveMessageToDB(sessionId, "assistant", result.content);
        }
        
        sessionEndedRef.current = true;
        goodbyeSentRef.current = true;
        localStorage.setItem(GOODBYE_SENT_KEY, "true");
        setSessionEnded(true);
        markSessionEnded();
        stopInactivityTimer();
        setIsLoading(false);
        return;
      }
      
      // Backend controls follow-up - just render what it returns
      if (result.followUp) {
        setAwaitingClosureConfirmation(true);
        
        const followUpMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.followUp,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, followUpMessage]);
        await saveMessageToDB(sessionId, "assistant", result.followUp);
      }

      if (result.content) {
        await saveMessageToDB(sessionId, "assistant", result.content);
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Show error from backend if available, otherwise show loading indicator
      const errorContent = botMessagesRef.current?.error;
      if (errorContent) {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: errorContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        await saveMessageToDB(sessionId, "assistant", errorContent);
      }
      // If no error message from backend, just show loading state ended
      setAwaitingClosureConfirmation(false);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, session, startNewSession, awaitingClosureConfirmation, stopInactivityTimer]);

  const onSubmitIdentityForm = async (data: IdentityFormData) => {
    setIsFormSubmitting(true);

    const sessionSnapshot = { ...session };

    try {
      const userInfo: UserInfo = {
        name: data.name,
        email: data.email || "",
        mobile: data.mobile || "",
        isExistingUser: false,
      };

      // Create session in DB and get greeting message from backend
      const result = await createSessionInDB(sessionSnapshot, userInfo);
      userInfo.isExistingUser = result.isExistingUser;

      if (result.existingUserName && !userInfo.name) {
        userInfo.name = result.existingUserName;
      }

      const updatedSession: ChatSession = {
        ...sessionSnapshot,
        userInfo,
        detailsCaptured: true,
      };

      setSession(updatedSession);
      saveSession(updatedSession);
      setShowForm(false);
      localStorage.removeItem(SHOW_FORM_KEY);
      setAwaitingClosureConfirmation(false);

      // Use greeting message from backend - no fallback
      const greetingContent = result.greetingMessage;
      if (!greetingContent) {
        console.error("Backend did not return greeting message");
      }

      if (greetingContent) {
        const greetingMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: greetingContent,
          timestamp: new Date(),
        };
        setMessages([greetingMsg]);
        saveMessages([greetingMsg]);
        await saveMessageToDB(sessionSnapshot.sessionId, "assistant", greetingContent);
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      // Show error state - no hardcoded message
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && session.detailsCaptured) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (sessionEnded) {
      setTimeout(() => {
        clearSession();
        startNewSession();
      }, 300);
    }
  }, [sessionEnded, startNewSession]);

  const showIdentityForm = showForm && !session.detailsCaptured && !sessionEnded;
  const showStartChatButton = !showForm && !session.detailsCaptured && !sessionEnded && botMessagesLoaded;

  return (
    <>
      {/* Floating Button with Helper Tooltip */}
      <div className={cn(
        "fixed right-6 z-50 flex flex-col items-center gap-2 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]",
        "transition-all duration-300 ease-out",
        isOpen && "scale-0 opacity-0 pointer-events-none"
      )}>
        {/* Chat Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full",
            "bg-primary shadow-lg overflow-hidden",
            "flex items-center justify-center",
            "transition-all duration-300 ease-out",
            "hover:scale-110 hover:shadow-xl"
          )}
          aria-label="Open chat"
        >
          <img 
            src="/images/ai/ai-assistant-for-nfc-digital-business-cards.jpg"
            alt="AI assistant for NFC digital business cards helping users share contact details"
            className="w-full h-full object-cover"
          />
        </button>
        
        {/* Animated Helper Tooltip */}
        <div className={cn(
          "bg-background border border-border rounded-full px-3 py-1.5 shadow-lg",
          "animate-[bounce_2s_ease-in-out_infinite]"
        )}>
          <span className="text-xs font-medium text-foreground whitespace-nowrap">
            Hi 👋 I'm here to help
          </span>
        </div>
      </div>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-100px)]",
          "bg-background border border-border rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "transition-all duration-300 ease-out origin-bottom-right",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img 
                src="/images/ai/ai-assistant-for-nfc-digital-business-cards.jpg"
                alt="AI assistant for NFC digital business cards helping users share contact details"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Saira</h3>
              <p className="text-xs text-muted-foreground">Synka AI Assistant</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Show loading if bot messages not loaded yet */}
            {!botMessagesLoaded && messages.length === 0 && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {/* Identity Form */}
            {showIdentityForm && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-muted rounded-2xl rounded-bl-md p-4">
                  <form onSubmit={handleSubmit(onSubmitIdentityForm)} className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          {...register("name")}
                          inputMode="text"
                          className="w-full pl-10 pr-3 py-3 text-base bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Your name"
                          disabled={isFormSubmitting}
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          {...register("email")}
                          type="email"
                          inputMode="email"
                          className="w-full pl-10 pr-3 py-3 text-base bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="your@email.com"
                          disabled={isFormSubmitting}
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Mobile</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          {...register("mobile")}
                          type="tel"
                          inputMode="tel"
                          className="w-full pl-10 pr-3 py-3 text-base bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Mobile number"
                          disabled={isFormSubmitting}
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">* Email or Mobile required</p>
                    </div>

                    <Button type="submit" disabled={isFormSubmitting} className="w-full rounded-full mt-2">
                      {isFormSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Chat"}
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {isLoading && !streamingMessageIdRef.current && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          {sessionEnded ? (
            <Button onClick={startNewSession} className="w-full rounded-full gap-2">
              <RotateCcw className="w-4 h-4" />
              Start New Chat
            </Button>
          ) : showStartChatButton ? (
            <Button onClick={handleStartChat} className="w-full rounded-full">
              Start Chat
            </Button>
          ) : showIdentityForm ? (
            <div className="text-center text-sm text-muted-foreground py-2">
              Please complete the form above to start chatting
            </div>
          ) : !botMessagesLoaded ? (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 rounded-full"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="rounded-full shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
