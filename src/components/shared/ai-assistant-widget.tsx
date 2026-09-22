"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Bot, User, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
}

export function AiAssistantWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMapView = (pathname === "/search" && searchParams?.get("view") === "map") || pathname === "/properties/map";
  const isDetailPage = 
    (pathname.startsWith("/properties/") && pathname !== "/properties" && pathname !== "/properties/map") ||
    (pathname.startsWith("/projects/") && pathname !== "/projects");
  const isNavHidden = isDetailPage || isMapView;

  const [isOpen, setIsOpen] = useState(false);
  const isDraggingRef = useRef(false);
  const [constraints, setConstraints] = useState({ left: -10, right: 300, top: -500, bottom: 20 });
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Dynamic visual viewport height listener for mobile virtual keyboard handling
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      setViewportHeight(vh);
      const keyboardActive = window.innerWidth < 640 && (window.innerHeight - vh > 120);
      setIsKeyboardOpen(keyboardActive);
    };

    handleResize();
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);
    window.addEventListener("resize", handleResize);

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Body scroll lock & global state flag when assistant is open on mobile
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      document.documentElement.setAttribute("data-ai-assistant-open", "true");
      if (window.innerWidth < 640) {
        document.body.style.overflow = "hidden";
      }
    } else {
      document.documentElement.removeAttribute("data-ai-assistant-open");
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.removeAttribute("data-ai-assistant-open");
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const updateConstraints = () => {
      if (typeof window !== "undefined") {
        setConstraints({
          left: -12,
          right: Math.max(0, window.innerWidth - 68),
          top: -Math.max(0, window.innerHeight - 130),
          bottom: 40,
        });
      }
    };
    updateConstraints();
    window.addEventListener("resize", updateConstraints);
    return () => window.removeEventListener("resize", updateConstraints);
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hi! I'm your AI Real Estate Assistant. What kind of property are you looking for today? (e.g., 'Find me a 3 BHK under 2 Cr in Jubilee Hills')" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Hide AI assistant on admin panel AFTER all hooks have executed to comply with React Rules of Hooks
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const performSearch = async (userMsg: string) => {
    if (isLoading) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      // Build a string representation of the conversation history for context
      const historyContext = messages
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg, history: historyContext }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error || "AI assistant is temporarily busy. You can use the search bar and filters above to find any property!";
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: errorMsg,
          },
        ]);
        toast.error(errorMsg);
        return;
      }

      // Add AI response message
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "assistant", 
        content: data.messageToUser 
      }]);

      // Apply filters and redirect ONLY if it's an actual property search
      if (data.isSearch) {
        setTimeout(() => {
          const queryParams = new URLSearchParams();
          if (data.location) queryParams.append("location", data.location);
          if (data.propertyType && data.propertyType !== "any") queryParams.append("type", data.propertyType);
          if (data.bhk && data.bhk !== "any") queryParams.append("bhk", data.bhk);
          if (data.budget && data.budget.length === 2) {
            queryParams.append("budget", data.budget.join(","));
          }
          
          toast.success("Filters applied by AI!");
          setIsOpen(false);
          router.push(`/search?${queryParams.toString()}`);
        }, 1500);
      }

    } catch (error: any) {
      console.error("[AI Assistant Widget Error]:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "assistant", 
        content: "AI assistant is temporarily unavailable. You can use the search bar and filters above to find verified properties!" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");
    await performSearch(userMsg);
  };

  const handleQuickSearch = (query: string) => {
    performSearch(query);
  };

  return (
    <>
      {/* Floating Action Button (Trigger) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            drag
            dragMomentum={false}
            dragElastic={0.12}
            dragConstraints={constraints}
            onDragStart={() => {
              isDraggingRef.current = true;
            }}
            onDragEnd={() => {
              setTimeout(() => {
                isDraggingRef.current = false;
              }, 120);
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              if (!isDraggingRef.current) {
                setIsOpen(true);
              }
            }}
            aria-label="Open AI Assistant"
            style={{ touchAction: "none" }}
            className={cn(
              "fixed left-4 w-12 h-12 lg:w-14 lg:h-14 bg-slate-950 hover:bg-slate-900 rounded-full shadow-2xl flex items-center justify-center z-[600] text-white border border-white/20 ring-2 ring-white/10 cursor-grab active:cursor-grabbing transition-shadow select-none",
              isMapView ? "bottom-20 sm:bottom-6" : isNavHidden ? "bottom-6" : "bottom-20 sm:bottom-6"
            )}
          >
            <div className="relative flex items-center justify-center pointer-events-none">
              <Bot className="w-6 h-6 lg:w-7 lg:h-7 stroke-[2.2] text-white" />
              <Sparkles className="w-3.5 h-3.5 absolute -top-1 -right-1.5 text-amber-400 fill-amber-400 animate-pulse" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile Backdrop Overlay (Dim background & prevent map interactions) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9998] sm:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Chat Window: Bottom Sheet on Mobile, Floating Card on Desktop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "fixed z-[9999] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all",
              // Mobile: Anchored bottom sheet
              "inset-x-0 bottom-0 rounded-t-[28px] border-t",
              // Desktop: Floating corner widget
              "sm:inset-auto sm:left-4 sm:bottom-6 sm:w-[380px] sm:max-w-sm sm:h-[520px] sm:rounded-2xl sm:border",
              isNavHidden ? "sm:bottom-6" : "sm:bottom-6"
            )}
            style={{
              // Constrain height dynamically on mobile to visualViewport (prevents keyboard cutoff)
              maxHeight:
                typeof window !== "undefined" && window.innerWidth < 640 && viewportHeight
                  ? `${viewportHeight}px`
                  : undefined,
              height:
                typeof window !== "undefined" && window.innerWidth < 640
                  ? (isKeyboardOpen && viewportHeight ? `${viewportHeight}px` : "82dvh")
                  : undefined,
            }}
          >
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-full bg-slate-950 dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center shadow-xs shrink-0">
                  <Bot className="w-4 h-4" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-none">ROAD Facing Concierge</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10 px-1.5 py-0.5 rounded">AI</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">Real Estate Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="https://wa.me/918977311418?text=Hi%20ROAD%20Facing%20Concierge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  title="Chat with ROAD Facing Concierge on WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                  <span>WhatsApp</span>
                </a>
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close AI Assistant"
                  className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 overscroll-contain">
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex items-start gap-2.5 max-w-[88%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                    msg.role === 'assistant' ? 'bg-slate-950 dark:bg-amber-500/20 text-white dark:text-amber-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-[13px] sm:text-sm leading-relaxed ${
                    msg.role === 'assistant' 
                      ? 'bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs shadow-2xs' 
                      : 'bg-slate-950 text-white font-medium rounded-tr-xs shadow-2xs'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {/* Quick Search Suggestions (Only show initially) */}
              {messages.length === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col gap-2 pt-1 sm:pl-9"
                >
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pl-0.5">Quick searches:</p>
                  {[
                    "Find me a 3 BHK in Benz Circle",
                    "Show me Villas under 2 Cr in Vijayawada",
                    "Apartments for rent in Patamata",
                  ].map((suggestion) => (
                    <button 
                      key={suggestion}
                      type="button"
                      onClick={() => handleQuickSearch(suggestion)} 
                      className="text-left text-xs bg-slate-50 dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-800 hover:border-amber-400/60 rounded-xl px-3.5 py-2.5 transition-all active:scale-[0.98] w-full sm:w-fit font-medium flex items-center justify-between gap-2 shadow-2xs group cursor-pointer"
                    >
                      <span>{suggestion}</span>
                      <Sparkles className="w-3 h-3 text-amber-500 opacity-60 group-hover:opacity-100 shrink-0" />
                    </button>
                  ))}
                </motion.div>
              )}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-2.5 max-w-[88%]"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-950 dark:bg-amber-500/20 text-white dark:text-amber-400 shrink-0 flex items-center justify-center mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 rounded-2xl rounded-tl-xs shadow-2xs flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form 
              onSubmit={handleSubmit} 
              className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="relative flex items-center">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything (e.g. 3BHK in Benz Circle)..."
                  className="pr-12 pl-4 py-2.5 h-11 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-sm rounded-full shadow-xs focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-white"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 w-8 h-8 rounded-full bg-slate-950 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 disabled:opacity-40 transition-all flex items-center justify-center shadow-xs cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
