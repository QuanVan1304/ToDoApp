"use client";

import { useState } from "react";
import { AgentNote } from "./AgentNote";
import { Input } from "@/components/ui/input";
import { useAgentChat } from "@/hooks/useAgentChat";

const AGENT_ENABLED = true;

export function AgentPanel() {
  const [value, setValue] = useState("");

  const {
    enabled,
    messages,
    isSending,
    error,
    sendMessage,
  } = useAgentChat({
    enabled: AGENT_ENABLED,
  });

  async function handleSubmit() {
    const text = value.trim();

    if (!text || isSending) return;

    setValue("");
    await sendMessage(text);
  }

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-rail)] px-6 py-6 lg:flex">
      <div className="mb-4">
        <p className="text-xs font-mono text-[var(--ink-muted)]">
          Trợ lý AI
        </p>

        <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
          Chạy cục bộ với qwen3
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <AgentNote>
            Chào bạn! Bạn có thể hỏi tôi về công việc hôm nay hoặc nhờ tôi
            lên kế hoạch.
          </AgentNote>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-8 rounded-xl bg-[var(--ink)] px-3 py-2 text-sm text-[var(--bg-main)]"
                : "mr-4"
            }
          >
            {message.role === "user" ? (
              message.content
            ) : (
              <AgentNote>{message.content}</AgentNote>
            )}
          </div>
        ))}

        {isSending && (
          <p className="animate-pulse text-xs text-[var(--ink-muted)]">
            Trợ lý đang suy nghĩ…
          </p>
        )}

        {error && (
          <p className="text-xs text-[var(--brick)]">
            {error}
          </p>
        )}
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={
            enabled
              ? "Nhắn với trợ lý…"
              : "Trợ lý hiện chưa bật"
          }
          disabled={!enabled || isSending}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
        />

        <p className="mt-2 text-[10px] text-[var(--ink-muted)]">
          Enter để gửi
        </p>
      </div>
    </aside>
  );
}