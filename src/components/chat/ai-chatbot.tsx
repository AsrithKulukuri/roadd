"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "model";
  parts: { text: string }[];
};

export function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      parts: [{ text: "Hi! I'm the ROAD FACING AI Assistant. How can I help you find your dream property today?" }],
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", parts: [{ text: input.trim() }] };
    
    // We send all messages except the very first generic greeting to save tokens
    const history = messages.length > 1 ? messages.slice(1) : []; 
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.parts[0].text, history }),
      });

      if (!res.ok) {
        let errStr = "Failed to generate response.";
        try {
          const errData = await res.json();
          if (errData.error) errStr = errData.error;
        } catch (e) {}
        throw new Error(errStr);
      }

      if (!res.body) throw new Error("No response body");

      setIsLoading(false); // Stop showing the loading spinner, start showing text
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let modelText = "";

      // Add a placeholder message for the model
      setMessages((prev) => [...prev, { role: "model", parts: [{ text: "" }] }]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          modelText += decoder.decode(value, { stream: true });
          
          // Update the last message in the state
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].parts[0].text = modelText;
            return newMessages;
          });
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        { role: "model", parts: [{ text: "Sorry, I'm having trouble connecting right now. Please try again later." }] },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatText = (text: string) => {
    // Simple markdown parsing for bold text and links
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-amber-500 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, "<br />");
    return { __html: formatted };
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        variant="amber"
        size="icon-lg"
        className={cn(
          "fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] right-4 lg:bottom-6 lg:right-6 z-[100] rounded-full shadow-amber-glow transition-transform duration-300",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed z-[101] flex flex-col bg-bg-card border border-border-default/50 shadow-elevated overflow-hidden transition-all duration-300 origin-bottom-right",
          "inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:max-w-[calc(100vw-32px)] sm:h-[550px] sm:max-h-[calc(100vh-120px)] sm:rounded-2xl",
          isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-bg-elevated border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-primary/20 flex items-center justify-center text-amber-primary">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-text-primary">ROAD FACING Assistant</h3>
              <p className="text-xs text-text-secondary">Powered by AI</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-text-secondary hover:text-text-primary" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3 max-w-[85%]", msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", msg.role === "user" ? "bg-bg-elevated text-text-secondary" : "bg-amber-primary/20 text-amber-primary")}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn("px-4 py-2 rounded-2xl text-sm leading-relaxed", msg.role === "user" ? "bg-bg-elevated text-text-primary rounded-tr-sm" : "bg-amber-primary/10 text-text-primary border border-amber-primary/20 rounded-tl-sm")}>
                <div dangerouslySetInnerHTML={formatText(msg.parts[0].text)} />
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="w-8 h-8 rounded-full bg-amber-primary/20 text-amber-primary flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-amber-primary/10 border border-amber-primary/20 rounded-tl-sm">
                <Loader2 className="w-4 h-4 animate-spin text-amber-primary" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 bg-bg-elevated border-t border-border-default pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
          <div className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about properties..."
              className="pr-12 bg-bg-card border-border-default focus-visible:ring-amber-primary rounded-xl text-sm"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="absolute right-1 top-1 h-8 w-8 bg-amber-primary hover:bg-amber-hover text-bg-primary rounded-lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
