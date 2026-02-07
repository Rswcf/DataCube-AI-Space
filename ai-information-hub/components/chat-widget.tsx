"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  weekId: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Condense raw week JSON into a compact text summary for the given language. */
function condenseWeekData(
  tech: any,
  investment: any,
  tips: any,
  trends: any,
  lang: "de" | "en"
): string {
  const lines: string[] = [];

  // Tech items
  const techItems = tech?.[lang] ?? tech?.de ?? [];
  if (techItems.length) {
    lines.push("## Tech News");
    for (const item of techItems) {
      lines.push(`- [${item.category || "General"}] (${item.impact || "medium"}) ${item.content ?? ""}${item.source ? ` (Source: ${item.source})` : ""}`);
    }
  }

  // Investment — primary market
  const primary = investment?.primaryMarket?.[lang] ?? investment?.primaryMarket?.de ?? [];
  if (primary.length) {
    lines.push("## Primary Market");
    for (const item of primary) {
      lines.push(`- ${item.company}: ${item.amount || "undisclosed"} (${item.round || "N/A"})`);
    }
  }

  // Investment — secondary market
  const secondary = investment?.secondaryMarket?.[lang] ?? investment?.secondaryMarket?.de ?? [];
  if (secondary.length) {
    lines.push("## Secondary Market");
    for (const item of secondary) {
      lines.push(`- ${item.ticker}: ${item.price} (${item.direction === "up" ? "+" : ""}${item.change})`);
    }
  }

  // Investment — M&A
  const ma = investment?.ma?.[lang] ?? investment?.ma?.de ?? [];
  if (ma.length) {
    lines.push("## M&A");
    for (const item of ma) {
      lines.push(`- ${item.acquirer} → ${item.target}: ${item.dealValue || "undisclosed"}`);
    }
  }

  // Tips
  const tipItems = tips?.[lang] ?? tips?.de ?? [];
  if (tipItems.length) {
    lines.push("## Tips");
    for (const item of tipItems) {
      lines.push(`- [${item.difficulty || "General"}] ${item.tip ?? item.content ?? ""} (${item.platform || ""})`);
    }
  }

  // Trends
  const trendItems = trends?.trends?.[lang] ?? trends?.trends?.de ?? [];
  if (trendItems.length) {
    lines.push("## Trends");
    for (const item of trendItems) {
      lines.push(`- ${item.title} (${item.category || ""})`);
    }
  }

  return lines.join("\n");
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function ChatWidget({ weekId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [weekContext, setWeekContext] = useState<string>("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { language, t } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch week data for context — regenerate when weekId or language changes
  useEffect(() => {
    if (!weekId) return;

    const fetchData = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL;

        const fetchOne = async (apiPath: string, staticPath: string) => {
          if (apiBase) {
            try {
              const res = await fetch(`${apiBase}${apiPath}`);
              if (res.ok) return res.json();
            } catch { /* fall through to static */ }
          }
          const res = await fetch(staticPath);
          return res.ok ? res.json() : null;
        };

        const [tech, investment, tips, trends] = await Promise.all([
          fetchOne(`/tech/${weekId}`, `/data/${weekId}/tech.json`),
          fetchOne(`/investment/${weekId}`, `/data/${weekId}/investment.json`),
          fetchOne(`/tips/${weekId}`, `/data/${weekId}/tips.json`),
          fetchOne(`/trends/${weekId}`, `/data/${weekId}/trends.json`),
        ]);

        const condensed = condenseWeekData(tech, investment, tips, trends, language);
        setWeekContext(condensed);
      } catch {
        setWeekContext("");
      }
    };

    fetchData();
    setMessages([]); // Clear messages when week changes
  }, [weekId, language]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (userMessage: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    // Abort any previous in-flight request
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 30-second timeout
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
          weekContext,
          language,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add empty assistant message
      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        // Update assistant message
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
        );
      }

      // Handle empty stream — model returned nothing
      if (!assistantContent.trim()) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: t("chatError") } : m))
        );
      }
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: isAbort ? t("chatTimeout") : t("chatError"),
        },
      ]);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, weekContext, language, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage(input.trim());
    setInput("");
  };

  const clearMessages = () => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl",
          "bottom-20 right-4 md:bottom-6 md:right-6",
          isOpen && "rotate-90"
        )}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl",
            "bottom-36 right-4 w-[380px] max-w-[calc(100vw-2rem)]",
            "h-[calc(100vh-160px)] max-h-[500px] md:h-[500px]",
            "md:bottom-24 md:right-6"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold">{t("chatTitle")}</h3>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="icon" onClick={clearMessages} title={t("chatClear")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-w-0 overflow-hidden p-4">
            <div ref={scrollRef} className="space-y-4">
              {messages.length === 0 ? (
                <div className="py-6 space-y-4">
                  <p className="text-center text-sm text-muted-foreground">{t("chatWelcome")}</p>
                  <div className="flex flex-col gap-2">
                    {(["chatSuggest1", "chatSuggest2", "chatSuggest3"] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => sendMessage(t(key))}
                        className="rounded-xl border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose-chat break-words">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoading && !messages[messages.length - 1]?.content && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-secondary px-4 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-border p-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("chatPlaceholder")}
                aria-label={t("chatPlaceholder")}
                className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 rounded-full"
                disabled={isLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
