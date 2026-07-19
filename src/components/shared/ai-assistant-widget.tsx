"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePropertiesStore } from "@/stores/properties-store";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
}

export function AiAssistantWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
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

  const performSearch = async (userMsg: string) => {
    if (isLoading) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse search");
      }

      // Add AI response message
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "assistant", 
        content: data.messageToUser 
      }]);

      // Apply filters and redirect
      setTimeout(() => {
        const queryParams = new URLSearchParams();
        if (data.location) queryParams.append("location", data.location);
        if (data.propertyType && data.propertyType !== "any") queryParams.append("type", data.propertyType);
        if (data.bhk && data.bhk !== "any") queryParams.append("bhk", data.bhk);
        if (data.budget && data.budget.length === 2) {
          // If a strict budget was parsed, pass it. You can format it based on your actual budget filter implementation.
          // For now, passing max budget as a simple query param or comma separated values.
          queryParams.append("budget", data.budget.join(","));
        }
        
        toast.success("Filters applied by AI!");
        setIsOpen(false);
        router.push(`/properties?${queryParams.toString()}`);
      }, 1500);

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "assistant", 
        content: "I'm sorry, I encountered an error or my API key is missing. Please try manually filtering." 
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
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 right-4 lg:right-6 w-14 h-14 bg-amber-primary rounded-full shadow-amber-glow flex items-center justify-center z-[90] text-bg-primary"
          >
            <Sparkles className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 right-4 lg:right-6 w-[90vw] max-w-sm h-[500px] max-h-[80vh] bg-bg-card border border-border-default shadow-elevated rounded-2xl flex flex-col overflow-hidden z-[100]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-bg-primary/50 border-b border-border-default backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-primary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-amber-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-sm">ROAD AI</h3>
                  <p className="text-[10px] text-text-secondary">Smart Search Assistant</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-text-secondary hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${
                    msg.role === 'assistant' ? 'bg-amber-primary/20 text-amber-primary' : 'bg-white/10 text-text-secondary'
                  }`}>
                    {msg.role === 'assistant' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm ${
                    msg.role === 'assistant' 
                      ? 'bg-bg-primary border border-border-default text-text-primary rounded-tl-sm' 
                      : 'bg-amber-primary text-bg-primary font-medium rounded-tr-sm'
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
                  transition={{ delay: 0.3 }}
                  className="flex flex-col gap-2 mt-2 ml-10"
                >
                  <button onClick={() => handleQuickSearch("Find me a 3 BHK in Benz Circle")} className="text-left text-xs bg-amber-primary/10 hover:bg-amber-primary/20 text-amber-primary border border-amber-primary/20 rounded-xl px-3 py-2 transition-colors w-fit">
                    Find me a 3 BHK in Benz Circle
                  </button>
                  <button onClick={() => handleQuickSearch("Show me Villas under 2 Cr in Vijayawada")} className="text-left text-xs bg-amber-primary/10 hover:bg-amber-primary/20 text-amber-primary border border-amber-primary/20 rounded-xl px-3 py-2 transition-colors w-fit">
                    Show me Villas under 2 Cr in Vijayawada
                  </button>
                  <button onClick={() => handleQuickSearch("Apartments for rent in Patamata")} className="text-left text-xs bg-amber-primary/10 hover:bg-amber-primary/20 text-amber-primary border border-amber-primary/20 rounded-xl px-3 py-2 transition-colors w-fit">
                    Apartments for rent in Patamata
                  </button>
                </motion.div>
              )}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-2 max-w-[85%]"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-primary/20 text-amber-primary flex-shrink-0 flex items-center justify-center mt-1">
                    <Bot className="w-3 h-3" />
                  </div>
                  <div className="bg-bg-primary border border-border-default p-3 rounded-2xl rounded-tl-sm">
                    <Loader2 className="w-4 h-4 text-amber-primary animate-spin" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-border-default bg-bg-primary/50">
              <div className="relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="pr-10 bg-bg-card border-border-default focus-visible:ring-amber-primary"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 text-amber-primary hover:text-amber-primary hover:bg-amber-primary/10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
