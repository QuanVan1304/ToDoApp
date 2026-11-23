"use client";

import { AnimatePresence } from "framer-motion";
import { TaskItem } from "./TaskItem";
import { useTasks } from "@/hooks/useTasks";
import { getDaysOld } from "@/lib/utils";
import type { Status } from "@/types";

interface TaskListProps {
  status?: Status;
  statuses?: Status[];
  projectId?: string;
  todayOnly?: boolean;
  showCreatedDate?: boolean | "past-only";
}

const STATUS_RANK: Record<Status, number> = {
  TODO: 0,
  INPROGRESS: 1,
  DONE: 2,
};

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

  const activeTasks = tasks.filter((t) => t.status !== "DONE");
  const criticalCount = activeTasks.filter(
    (t) => getDaysOld(t.createdAt) >= 7,
  ).length;
  const warnCount = activeTasks.filter((t) => {
    const d = getDaysOld(t.createdAt);
    return d >= 3 && d < 7;
  }).length;

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (statusDiff !== 0) return statusDiff;

    if (a.status !== "DONE") {
      const ageA = getDaysOld(a.createdAt);
      const ageB = getDaysOld(b.createdAt);
      const tierA = ageA >= 7 ? 2 : ageA >= 3 ? 1 : 0;
      const tierB = ageB >= 7 ? 2 : ageB >= 3 ? 1 : 0;
      if (tierA !== tierB) return tierB - tierA;
      if (tierA > 0 && ageA !== ageB) return ageB - ageA;
    }

    return a.order - b.order;
  });

  return (
    <div className="w-full">
      {(criticalCount > 0 || warnCount > 0) && (
        <div
          className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            criticalCount > 0
              ? "border-[var(--brick)]/30 bg-[var(--brick)]/[0.06] text-[var(--ink)]"
              : "border-[var(--mustard)]/35 bg-[var(--mustard)]/[0.08] text-[var(--ink)]"
          }`}
        >
          <span
            className="mt-0.5 font-mono text-xs font-semibold"
            style={{
              color: criticalCount > 0 ? "var(--brick)" : "var(--mustard)",
            }}
          >
            {criticalCount > 0 ? "!" : "◷"}
          </span>

          <div className="min-w-0 flex-1 leading-relaxed">
            {criticalCount > 0 ? (
              <>
                <span className="font-medium text-[var(--brick)]">
                  Cảnh báo tồn đọng:{" "}
                </span>
                <span>
                  Bạn có <strong>{criticalCount} công việc</strong> đã để quá 7
                  ngày chưa hoàn thành
                  {warnCount > 0
                    ? ` (và ${warnCount} việc ngâm 3–6 ngày)`
                    : ""}
                  . Hãy bấm <strong>Làm ngay</strong> để xử lý dứt điểm hoặc{" "}
                  <strong>Xoá</strong> nếu không còn cần thiết.
                </span>
              </>
            ) : (
              <>
                <span className="font-medium text-[var(--mustard)]">
                  Nhắc nhở:{" "}
                </span>
                <span>
                  Có <strong>{warnCount} công việc</strong> đã ngâm từ 3 ngày
                  trở lên. Hãy giải quyết sớm trước khi sổ tay bị ứ đọng quá 1
                  tuần.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <section className="ruled-lines w-full min-h-[calc(100dvh-15rem)] border-y border-[var(--border)]">
        <AnimatePresence initial={false}>
          {sortedTasks.map((task) => (
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
    </div>
  );
}