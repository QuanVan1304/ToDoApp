"use client";

import { motion } from "framer-motion";
import { TaskCheckbox } from "./TaskCheckbox";
import { formatDate, formatFullDate, isBeforeToday } from "@/lib/utils";
import type { Status, TaskWithRelations } from "@/types";

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "var(--ink-muted)",
  NORMAL: "var(--teal)",
  HIGH: "var(--mustard)",
  URGENT: "var(--brick)",
};

interface TaskItemProps {
  task: TaskWithRelations;
  onAdvance: (id: string, currentStatus: Status) => void;
  onDelete: (id: string) => void;
  showCreatedDate?: boolean | "past-only";
}

export function TaskItem({
  task,
  onAdvance,
  onDelete,
  showCreatedDate = false,
}: TaskItemProps) {
  const isPending = task.id.startsWith("temp-");
  const isDone = task.status === "DONE";
  const isInProgress = task.status === "INPROGRESS";
  const isOverdue =
    !isDone &&
    task.dueDate &&
    new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
  const shouldShowCreatedDate =
    Boolean(task.createdAt) &&
    (showCreatedDate === true ||
      (showCreatedDate === "past-only" && isBeforeToday(task.createdAt)));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isDone ? 0.55 : isPending ? 0.75 : 1, y: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="group flex items-start gap-[0.6rem] border-b border-[var(--border)] py-[0.7rem] pr-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
    >
      <TaskCheckbox
        checked={isDone}
        onToggle={() => {
          // Task trong lịch sử hoặc đang lưu tạm không được tick.
          if (!isDone && !isPending) {
            onAdvance(task.id, task.status);
          }
        }}
      />

      <span
        className={`mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${
          task.priority === "URGENT" ? "animate-pulse" : ""
        }`}
        style={{
          backgroundColor: PRIORITY_COLOR[task.priority],
          boxShadow: isInProgress
            ? "0 0 0 3px color-mix(in srgb, var(--teal) 18%, transparent)"
            : undefined,
        }}
      />

      <div className="min-w-0 flex-1">
        <div className="font-sans text-[0.93rem] leading-[1.45] text-[var(--ink)]">
          <span className={isDone ? "task-strike" : ""}>
            {task.title}
          </span>

          {isInProgress && (
            <span className="ml-2 inline-flex rounded-full bg-[var(--teal)]/12 px-2 py-0.5 text-[10px] font-medium text-[var(--teal)]">
              Đang làm
            </span>
          )}
        </div>

        {shouldShowCreatedDate && (
          <div className="mt-0.5 font-mono text-[0.7rem] text-[var(--ink-muted)]">
            {formatFullDate(task.createdAt)}
          </div>
        )}
      </div>

      {task.dueDate && (
        <span
          className="mt-[2px] shrink-0 font-mono text-[0.72rem]"
          style={{
            color: isOverdue ? "var(--brick)" : "var(--ink-muted)",
          }}
        >
          {formatDate(task.dueDate)}
        </span>
      )}

      {task.source === "AGENT" && (
        <span className="mt-[2px] shrink-0 font-mono text-[0.65rem] uppercase text-[var(--mustard)]">
          AI
        </span>
      )}

      {!isPending && (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="mt-0.5 shrink-0 text-[11px] opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
          style={{ color: "var(--ink-muted)" }}
          aria-label={`Xoá công việc ${task.title}`}
        >
          Xoá
        </button>
      )}
    </motion.div>
  );
}