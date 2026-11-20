"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

export function MarginNote() {
  const [notes] = useState<string[]>([
    "Ghi chú bên lề sẽ xuất hiện ở đây khi bạn trò chuyện với trợ lý”.",
  ]);

  return (
    <aside className="hidden lg:flex w-80 shrink-0 flex-col border-l border-[var(--border)] px-6 py-6">
      <p className="text-xs font-mono text-[var(--ink-muted)] mb-4">Ghi chú bên lề</p>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {notes.map((note, i) => (
          <p
            key={i}
            className="border-l-2 border-[var(--mustard)] pl-3 font-serif italic text-sm leading-relaxed text-[var(--ink)]"
          >
            {note}
          </p>
        ))}
      </div>

      <Input placeholder="Nhắn với trợ lý… (sắp ra mắt)" disabled className="mt-4" />
    </aside>
  );
}
