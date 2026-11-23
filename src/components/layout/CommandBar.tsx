"use client";

import { useState } from "react";

export function CommandBar({
  onSubmit,
  placeholder = "Viết công việc mới...",
  isAgentOpen = false,
  onToggleAgent,
}: {
  onSubmit: (title: string) => void;
  placeholder?: string;
  isAgentOpen?: boolean;
  onToggleAgent?: () => void;
}) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const title = value.trim();

    if (!title) return;

    onSubmit(title);
    setValue("");
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-6">
      <div className="pointer-events-auto flex w-full max-w-[780px] flex-col items-center">
        <div className="flex w-full items-center justify-center gap-3">
          <div className="group flex w-full max-w-[620px] items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--bg-main)]/90 px-4 py-3 shadow-[0_12px_40px_rgba(35,34,32,0.12)] backdrop-blur-xl transition-all focus-within:border-[var(--mustard)]/50 focus-within:shadow-[0_14px_45px_rgba(35,34,32,0.16)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            {/* Icon */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--mustard)]/12 text-[var(--mustard)]">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>

            {/* Input */}
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-[0.88rem] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
            />

            {/* Keyboard hint */}
            <div className="hidden items-center gap-1 sm:flex">
              <kbd className="rounded-md border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--ink-muted)]">
                Enter
              </kbd>
            </div>
          </div>

          {onToggleAgent && (
            <button
              type="button"
              onClick={onToggleAgent}
              title="Trợ lý AI"
              className={`flex shrink-0 items-center gap-2 rounded-[14px] border px-3.5 py-3 text-[0.84rem] font-medium shadow-[0_12px_40px_rgba(35,34,32,0.12)] backdrop-blur-xl transition-all dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)] ${
                isAgentOpen
                  ? "border-[var(--teal)] bg-[var(--teal)] text-white"
                  : "border-[var(--mustard)]/45 bg-[var(--bg-main)]/95 text-[var(--ink)] hover:border-[var(--mustard)] hover:bg-[var(--mustard)]/10"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md ${
                  isAgentOpen
                    ? "bg-white/20 text-white"
                    : "bg-[var(--mustard)]/18 text-[var(--mustard)]"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
                  <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
                </svg>
              </span>

              <span>Trợ lý AI</span>
            </button>
          )}
        </div>

        <div className="mt-2 text-center text-[10px] text-[var(--ink-muted)] opacity-60">
          Nhấn Enter để thêm công việc
        </div>
      </div>
    </div>
  );
}
