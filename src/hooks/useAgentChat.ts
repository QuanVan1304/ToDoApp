"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function useAgentChat({
  enabled = false,
}: {
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(content: string) {
    const message = content.trim();

    if (!enabled || !message || isSending) {
      return;
    }

    setError(null);
    setIsSending(true);

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
      },
    ]);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Không thể kết nối với trợ lý.",
        );
      }

      if (data.mutation) {
        await queryClient.invalidateQueries({
          queryKey: ["tasks"],
        });
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            data.message ?? "Qwen không trả về nội dung.",
        },
      ]);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Không thể kết nối với trợ lý.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return {
    enabled,
    messages,
    isSending,
    error,
    sendMessage,
  };
}