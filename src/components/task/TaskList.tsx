"use client";

import { AnimatePresence } from "framer-motion";
import { TaskItem } from "./TaskItem";
import { useTasks } from "@/hooks/useTasks";
import type { Status } from "@/types";

interface TaskListProps {
  status?: Status;
  statuses?: Status[];
  projectId?: string;
  todayOnly?: boolean;
  showCreatedDate?: boolean | "past-only";
}

export function TaskList({
  status,
  statuses,
  projectId,
  todayOnly,
  showCreatedDate = false,
}: TaskListProps) {
  const { tasks, isLoading, updateTaskStatus, deleteTask } = useTasks({
    status,
    statuses,
    projectId,
    todayOnly,
  });

  function handleAdvance(id: string, currentStatus: Status) {
    if (currentStatus === "TODO") {
      updateTaskStatus({ id, status: "INPROGRESS" });
      return;
    }

    if (currentStatus === "INPROGRESS") {
      updateTaskStatus({ id, status: "DONE" });
    }
  }

  if (isLoading) {
    return (
      <div className="w-full py-12 text-center font-mono text-sm text-[var(--ink-muted)]">
        Đang tải...
      </div>
    );
  }

  return (
    <section className="ruled-lines w-full min-h-[calc(100dvh-15rem)] border-y border-[var(--border)]">
      <AnimatePresence initial={false}>
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onAdvance={handleAdvance}
            onDelete={deleteTask}
            showCreatedDate={showCreatedDate}
          />
        ))}
      </AnimatePresence>

      {tasks.length === 0 && (
        <div className="flex min-h-[22rem] items-center justify-center px-6">
          <p className="max-w-md text-center font-serif text-lg leading-relaxed text-[var(--ink-muted)]">
            {status === "INPROGRESS"
              ? "Chưa có công việc nào đang thực hiện."
              : status === "DONE"
                ? "Chưa có công việc nào trong lịch sử."
                : "“Trang gi\u1EA5y tr\u1EAFng l\u00E0 s\u1EF1 kh\u1EDFi \u0111\u1EA7u t\u1ED1t nh\u1EA5t”"}
          </p>
        </div>
      )}
    </section>
  );
}