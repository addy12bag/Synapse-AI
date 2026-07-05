"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { Sparkles, Send, ChevronDown, Trash2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendTutorMessage, clearChatHistory } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AiTutorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const sendText = textOverride || input;
    if (!sendText.trim() || isPending) return;

    setInput("");
    
    // Add user message instantly
    setMessages((prev) => [...prev, { role: "user", content: sendText }]);

    startTransition(async () => {
      try {
        const response = await sendTutorMessage({
          content: sendText,
          subjectId: null, // General tutor
        });

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.content },
        ]);
      } catch (err) {
        console.error(err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
        ]);
      }
    });
  };

  const handleClearHistory = async () => {
    startTransition(async () => {
      try {
        await clearChatHistory();
        setMessages([]);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleSuggestionClick = (text: string) => {
    handleSend(undefined, text);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* CSS Animation style tag for bounce staggered dots */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes tutorBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .tutor-dot {
          animation: tutorBounce 0.8s infinite ease-in-out;
        }
      `}} />

      {/* ─── COLLAPSED FLOATING BUBBLE BUTTON ─────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.5)] hover:scale-105 transition-all duration-300 group outline-none"
          title="Ask AI Tutor"
        >
          {/* Glowing outer animation rings */}
          <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-25"></span>
          <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
        </button>
      )}

      {/* ─── EXPANDED CHAT CONTAINER PANEL ────────────────────────────────── */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[380px] h-[520px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] rounded-2xl overflow-hidden glass border-white/10 shadow-2xl flex flex-col transition-all duration-300 transform origin-bottom-right bg-zinc-950/80 backdrop-blur-3xl",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-75 opacity-0 translate-y-10 pointer-events-none"
        )}
      >
        {/* Header Bar */}
        <div className="px-4 py-3 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20 text-primary">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white leading-none">StudyAI Tutor</h3>
              <span className="text-[9px] text-muted-foreground">General-purpose tutor</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-white h-7 w-7 border-transparent"
                onClick={handleClearHistory}
                title="Clear Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-white h-7 w-7 border-transparent"
              onClick={() => setIsOpen(false)}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-white/[0.01]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="p-3 bg-primary/10 rounded-full border border-primary/20 text-primary">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-white font-semibold">Welcome to AI Tutor!</p>
                <p className="text-[10px] text-muted-foreground max-w-[220px]">
                  Ask me questions about math, science, history or study tips. I&apos;m ready to guide you.
                </p>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                {[
                  "Explain a concept",
                  "Help me study",
                  "Quiz me on a topic",
                  "Study tips",
                ].map((sugg, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(sugg)}
                    className="p-2 text-[10px] text-left rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 text-white transition-all cursor-pointer"
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2.5 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                {/* Sparkle avatar for AI */}
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                )}

                <div
                  className={cn(
                    "p-2.5 rounded-2xl text-[11px] leading-relaxed space-y-1.5",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-white/5 border border-white/5 text-white rounded-tl-none"
                  )}
                >
                  <div className="prose prose-invert max-w-none text-[11px] [&_p]:m-0 [&_ul]:list-disc [&_ul]:pl-3 [&_ol]:list-decimal [&_ol]:pl-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {isPending && (
            <div className="flex gap-2.5 max-w-[85%] mr-auto">
              <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
              <div className="p-2.5 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-muted-foreground tutor-dot" style={{ animationDelay: "0s" }}></span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground tutor-dot" style={{ animationDelay: "0.15s" }}></span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground tutor-dot" style={{ animationDelay: "0.3s" }}></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-white/5 bg-white/[0.03] flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={isPending}
            className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isPending}
            className="h-8 w-8 bg-primary hover:bg-primary/80"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Send className="w-3.5 h-3.5 text-white" />
            )}
          </Button>
        </form>
      </div>
    </>
  );
}
