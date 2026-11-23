"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "notebook_agent_chat_v1";
const CHAT_TTL_MS = 10 * 60_000;

interface StoredChat {
  messages: ChatMessage[];
  expiresAt: number;
}

function loadStoredChat(): StoredChat | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredChat;
    if (!parsed || !Array.isArray(parsed.messages) || typeof parsed.expiresAt !== "number") {
      return null;
    }
    if (Date.now() >= parsed.expiresAt) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredChat(messages: ChatMessage[]): number {
  const expiresAt = Date.now() + CHAT_TTL_MS;
  if (typeof window !== "undefined") {
    try {
      if (messages.length === 0) {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ messages, expiresAt }),
        );
      }
    } catch {
      // Bỏ qua nếu trình duyệt chặn sessionStorage
    }
  }
  return expiresAt;
}

export function useAgentChat({
  enabled = false,
}: {
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<ChatMessage[]>(
    () => loadStoredChat()?.messages ?? [],
  );
  const [expiresAt, setExpiresAt] = useState<number | null>(
    () => loadStoredChat()?.expiresAt ?? null,
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tự động giải phóng lịch sử chat sau 10 phút không có tin nhắn mới
  useEffect(() => {
    if (!expiresAt || messages.length === 0) return;

    const remaining = Math.max(0, expiresAt - Date.now());
    const timer = setTimeout(() => {
      setMessages([]);
      setExpiresAt(null);
      saveStoredChat([]);
    }, remaining);

    return () => clearTimeout(timer);
  }, [expiresAt, messages.length]);

  function clearChat() {
    setMessages([]);
    setExpiresAt(null);
    setError(null);
    saveStoredChat([]);
  }

  async function sendMessage(content: string) {
    const message = content.trim();

    if (!enabled || !message || isSending) {
      return;
    }

    setError(null);
    setIsSending(true);

    // Gửi kèm tối đa 6 tin nhắn gần nhất để AI hiểu mạch hội thoại liên tiếp
    const recentHistory = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    const nextWithUser = [...messages, userMsg];
    setMessages(nextWithUser);
    setExpiresAt(saveStoredChat(nextWithUser));

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: recentHistory,
        }),
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

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          data.message ?? "Trợ lý chưa trả về nội dung.",
      };

      const nextWithReply = [...nextWithUser, assistantMsg];
      setMessages(nextWithReply);
      setExpiresAt(saveStoredChat(nextWithReply));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
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
    clearChat,
  };
}
