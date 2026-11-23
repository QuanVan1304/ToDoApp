"use client";

import { useEffect, useRef, useState } from "react";
import { AgentNote } from "./AgentNote";
import { Input } from "@/components/ui/input";
import { useAgentChat } from "@/hooks/useAgentChat";

const AGENT_ENABLED = true;

const QUICK_PROMPTS = [
  "Hôm nay tôi còn những việc gì cần làm?",
  "Gợi ý việc tôi nên ưu tiên làm trước",
  "Tóm tắt danh sách dự án của tôi",
];

export function AgentPanel({ onClose }: { onClose?: () => void }) {
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    enabled,
    messages,
    isSending,
    error,
    sendMessage,
    clearChat,
  } = useAgentChat({
    enabled: AGENT_ENABLED,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isSending]);

  async function handleSubmit() {
    const text = value.trim();

    if (!text || isSending) return;

    setValue("");
    await sendMessage(text);
  }

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-rail)] px-5 py-6">
      <div className="mb-4 flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3.5">
        <div>
          <p className="font-mono text-xs font-medium text-[var(--ink)]">
            ✦ Trợ lý AI
          </p>

          <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
            Hỗ trợ quản lý công việc
          </p>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              title="Làm mới cuộc trò chuyện"
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-[var(--ink-muted)] transition-colors hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/5"
              aria-label="Làm mới cuộc trò chuyện"
            >
              ↻
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Đóng Trợ lý AI"
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-[var(--ink-muted)] transition-colors hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/5"
              aria-label="Đóng Trợ lý AI"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="space-y-4">
            <AgentNote>
              Chào bạn! Chọn nhanh một gợi ý dưới đây hoặc nhắn trực tiếp để tôi
              kiểm tra, thêm, cập nhật công việc giúp bạn.
            </AgentNote>

            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                Gợi ý bấm nhanh
              </p>

              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={!enabled || isSending}
                  onClick={() => void sendMessage(prompt)}
                  className="block w-full rounded-lg border border-[var(--border)] bg-[var(--bg-main)]/75 px-3 py-2 text-left text-xs text-[var(--ink)] transition-colors hover:border-[var(--mustard)]/60 hover:bg-[var(--bg-main)] disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-6 rounded-2xl rounded-tr-sm bg-[var(--ink)] px-3.5 py-2 text-[0.83rem] leading-relaxed text-[var(--bg-main)]"
                : "mr-1"
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
          <div className="flex items-center gap-2 rounded-r-xl border-l-2 border-[var(--mustard)]/60 bg-[var(--bg-main)]/50 px-3 py-2 text-xs text-[var(--ink-muted)]">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[var(--mustard)]" />
            <span>Trợ lý đang suy nghĩ…</span>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-[var(--brick)]/30 bg-[var(--brick)]/10 px-3 py-2 text-xs text-[var(--brick)]">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-3.5">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={
            enabled
              ? "Nhắn với trợ lý (vd: thêm việc...)"
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
