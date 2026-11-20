"use client";

import { motion } from "framer-motion";
import { cn, formatDate } from "@/lib/utils";
import type { TaskWithTags } from "@/types/task";

const priorityDot: Record<TaskWithTags["priority"], string> = {
  LOW: "bg-[var(--ink-muted)]",
  NORMAL: "bg-[var(--teal)]",
  HIGH: "bg-[var(--mustard)]",
  URGENT: "bg-[var(--brick)]",
};

interface TaskRowProps {
  task: TaskWithTags;
  onToggleDone: (task: TaskWithTags) => void;
  onOpen: (task: TaskWithTags) => void;
}

export function TaskRow({ task, onToggleDone, onOpen }: TaskRowProps) {
  const isDone = task.status === "DONE";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center gap-3 border-b border-[var(--border)] py-3 px-1 cursor-pointer"
      onClick={() => onOpen(task)}
    >
      {/* Chấm trạng thái/độ ưu tiên — thay cho viền màu cả dòng */}
      <button
        aria-label="Đánh dấu hoàn thành"
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(task);
        }}
        className={cn(
          "h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--ink)]/20 transition-colors",
          isDone ? "bg-[var(--teal)] border-[var(--teal)]" : priorityDot[task.priority]
        )}
      />

      <span
        className={cn(
          "flex-1 text-[15px] leading-snug",
          isDone && "line-through text-[var(--ink-muted)]"
        )}
      >
        {task.title}
        {task.source === "AGENT" && (
          <span className="ml-2 align-middle text-[10px] font-mono text-[var(--mustard)]">
            ✦ AI
          </span>
        )}
      </span>

      {task.project && (
        <span className="hidden sm:inline text-xs text-[var(--ink-muted)] font-sans">
          {task.project.name}
        </span>
      )}

      {task.dueDate && (
        <span className="font-mono text-xs text-[var(--ink-muted)] tabular-nums">
          {formatDate(task.dueDate)}
        </span>
      )}
    </motion.li>
  );
}
