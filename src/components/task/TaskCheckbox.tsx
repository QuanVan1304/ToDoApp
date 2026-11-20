// src/components/task/TaskCheckbox.tsx
"use client";

interface TaskCheckboxProps {
  checked: boolean;
  onToggle: () => void;
}

export function TaskCheckbox({ checked, onToggle }: TaskCheckboxProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={checked ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}
      className="relative mt-0.5 h-[18px] w-[18px] flex-shrink-0 rounded-[4px] border-[1.6px] transition-colors"
      style={{
        borderColor: checked ? "var(--teal)" : "var(--ink-muted)",
        backgroundColor: checked ? "var(--teal)" : "transparent",
      }}
    >
      {checked && (
        <span
          className="absolute left-[4px] top-[1px] h-[10px] w-[6px] rotate-[40deg]"
          style={{
            borderRight: "2px solid var(--bg-main)",
            borderBottom: "2px solid var(--bg-main)",
          }}
        />
      )}
    </button>
  );
}
