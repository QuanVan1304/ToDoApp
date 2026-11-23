"use client";

import React from "react";

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-[var(--ink)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(
        <em key={key++} className="italic text-[var(--ink-muted)]">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.76rem] dark:bg-white/10"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function normalizeTextToLines(raw: string): string[] {
  // Nếu model trả về danh sách đánh số dính liền trên cùng 1 dòng (vd: "... 1. **A** 2. **B**"),
  // tự động tách xuống dòng để dễ đọc.
  const separated = raw
    .replace(/\r\n/g, "\n")
    .replace(/([:.)?!])\s+(\d+\.\s)/g, "$1\n$2")
    .replace(/\s+(-\s+\*\*)/g, "\n$1");

  return separated
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AgentNote({ children }: { children: React.ReactNode }) {
  if (typeof children !== "string") {
    return (
      <div className="rounded-r-xl border-l-2 border-[var(--mustard)] bg-[var(--bg-main)]/75 px-3.5 py-2.5 text-[0.84rem] leading-relaxed text-[var(--ink)]">
        {children}
      </div>
    );
  }

  const lines = normalizeTextToLines(children);

  return (
    <div className="space-y-2 rounded-r-xl border-l-2 border-[var(--mustard)] bg-[var(--bg-main)]/75 px-3.5 py-2.5 text-[0.83rem] leading-relaxed text-[var(--ink)]">
      {lines.map((line, idx) => {
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--mustard)]/18 font-mono text-[10px] font-semibold text-[var(--mustard)]">
                {numberedMatch[1]}
              </span>
              <div className="min-w-0 flex-1">
                {renderInlineMarkdown(numberedMatch[2])}
              </div>
            </div>
          );
        }

        const bulletMatch = line.match(/^[-•*]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--mustard)]" />
              <div className="min-w-0 flex-1">
                {renderInlineMarkdown(bulletMatch[1])}
              </div>
            </div>
          );
        }

        return (
          <p key={idx} className="m-0">
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}
