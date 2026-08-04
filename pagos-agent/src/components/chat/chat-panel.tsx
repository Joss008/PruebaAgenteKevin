"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "bot";
  content: string;
}

const QUICK_ACTIONS = [
  { label: "Mis pagos", message: "mis pagos" },
  { label: "Ayuda", message: "ayuda" },
];

function parseMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[4]) {
      parts.push(<em key={key++}>{match[4]}</em>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function BotMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <div key={i} className="leading-relaxed">
          {line === "" ? <br /> : <>{parseMarkdown(line)}</>}
        </div>
      ))}
    </div>
  );
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content: "Hola! Soy tu agente de pagos. Que necesitas?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", content: data.message }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "Error al procesar tu mensaje. Intenta de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Conversa con tu agente de pagos</p>
      </div>

      <Card className="flex-1 overflow-y-auto p-5 space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "bot" ? (
                <BotMessage content={msg.content} />
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </Card>

      {messages.length <= 1 && (
        <div className="flex gap-2 mb-3">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.message}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.message)}
              disabled={loading}
              className="rounded-xl"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={loading}
          className="flex-1 rounded-xl"
        />
        <Button type="submit" disabled={loading || !input.trim()} className="rounded-xl px-5">
          Enviar
        </Button>
      </form>
    </div>
  );
}
