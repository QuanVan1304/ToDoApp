"use client";

import { useState } from "react";

export function TaskCreateInline({
  onCreate,
}: {
  onCreate: (title: string) => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const title = value.trim();
    if (!title) return;
    onCreate(title);
    setValue("");
  }

  return (
    <li className="flex items-center gap-3 py-3 px-1">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-[var(--ink-muted)]" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Thêm một dòng việc mới…"
        className="flex-1 bg-transparent text-[15px] placeholder:text-[var(--ink-muted)] focus:outline-none"
      />
    </li>
  );
}
