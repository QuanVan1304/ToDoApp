"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence } from "framer-motion";
import { TaskItem } from "./TaskItem";
import { useTasks } from "@/hooks/useTasks";
import { getDaysOld, isVietnamEvening } from "@/lib/utils";
import type { Status } from "@/types";

function subscribeEveningClock(onStoreChange: () => void) {
  const timer = setInterval(onStoreChange, 1_000);
  return () => clearInterval(timer);
}

interface TaskListProps {
  status?: Status;
  statuses?: Status[];
  projectId?: string;
  projectColor?: string | null;
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
  projectColor,
  todayOnly,
  showCreatedDate = false,
}: TaskListProps) {
  const {
    tasks,
    isLoading,
    updateTaskStatus,
    deleteTask,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useTasks({
    status,
    statuses,
    projectId,
    todayOnly,
  });

  const isEvening = useSyncExternalStore(
    subscribeEveningClock,
    () => isVietnamEvening(),
    () => false,
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMod = event.ctrlKey || event.metaKey;
      if (!isMod) return;

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  function handleAdvance(id: string, currentStatus: Status) {
    if (currentStatus === "TODO") {
      updateTaskStatus({ id, status: "INPROGRESS" });
      return;
    }

    if (currentStatus === "INPROGRESS") {
      updateTaskStatus({ id, status: "DONE" });
    }
  }

  function handleRevert(id: string, currentStatus: Status) {
    if (currentStatus === "DONE") {
      updateTaskStatus({ id, status: "INPROGRESS" });
      return;
    }

    if (currentStatus === "INPROGRESS") {
      updateTaskStatus({ id, status: "TODO" });
    }
  }

  if (isLoading) {
    return (
      <div className="w-full py-12 text-center font-mono text-sm text-[var(--ink-muted)]">
        Đang tải...
      </div>
    );
  }

  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const activeTasks = tasks.filter((t) => t.status !== "DONE");
  const untouchedCount = activeTasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = activeTasks.filter(
    (t) => t.status === "INPROGRESS",
  ).length;
  const donePercent =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const inProgressPercent =
    totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0;
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

  const accentColor =
    donePercent === 100 ? "var(--teal)" : projectColor || "var(--teal)";

  return (
    <div className="w-full">
      {projectId && (
        <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-rail)]/65 px-5 py-4">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                Tiến độ dự án
              </span>
              <span
                className="font-serif text-xl font-semibold"
                style={{ color: accentColor }}
              >
                {donePercent}%
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-[var(--ink-muted)]">
              <span>
                <strong className="text-[var(--ink)]">{doneCount}</strong>/
                {totalCount} hoàn thành
              </span>
              {inProgressCount > 0 && (
                <span className="text-[var(--teal)]">
                  · {inProgressCount} đang làm
                </span>
              )}
              {untouchedCount > 0 && (
                <span>· {untouchedCount} chưa làm</span>
              )}
            </div>
          </div>

          <div className="relative flex h-2.5 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{
                width: `${donePercent}%`,
                backgroundColor: accentColor,
              }}
            />
            {inProgressPercent > 0 && (
              <div
                className="h-full opacity-35 transition-all duration-300 ease-out"
                style={{
                  width: `${Math.min(100 - donePercent, inProgressPercent)}%`,
                  backgroundColor: accentColor,
                }}
              />
            )}
          </div>

          {totalCount > 0 && donePercent === 100 && (
            <p className="mt-2.5 font-serif text-xs italic text-[var(--teal)]">
              ✓ Toàn bộ công việc trong dự án dài hạn này đã hoàn tất 100%!
            </p>
          )}
        </div>
      )}

      {isEvening && activeTasks.length > 0 && (
        <div className="mb-3 flex items-start gap-3 rounded-xl border border-[var(--mustard)]/35 bg-[var(--mustard)]/[0.08] px-4 py-3 text-sm text-[var(--ink)]">
          <span
            className="mt-0.5 font-mono text-xs font-semibold"
            style={{ color: "var(--mustard)" }}
          >
            ☾
          </span>

          <div className="min-w-0 flex-1 leading-relaxed">
            <span className="font-medium text-[var(--mustard)]">
              Nhắc nhở cuối ngày:{" "}
            </span>
            <span>
              {untouchedCount > 0 && inProgressCount > 0 ? (
                <>
                  Bạn vẫn còn{" "}
                  <strong>{untouchedCount} việc chưa đụng tới</strong> và{" "}
                  <strong>{inProgressCount} việc chưa hoàn thành</strong>. Hãy
                  tranh thủ hoàn tất hoặc khởi động trước khi bước sang ngày
                  mới nhé!
                </>
              ) : untouchedCount > 0 ? (
                <>
                  Đã cuối ngày nhưng bạn vẫn còn{" "}
                  <strong>{untouchedCount} công việc chưa bắt đầu</strong>. Hãy
                  bấm <strong>Làm ngay</strong> hoặc tick ô vuông để khởi động!
                </>
              ) : (
                <>
                  Bạn đang có{" "}
                  <strong>{inProgressCount} công việc chưa hoàn thành</strong> — cố gắng
                  làm cho xong trước khi kết thúc ngày hôm nay nhé!
                </>
              )}
            </span>
          </div>
        </div>
      )}

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

      <div className="mb-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title="Hoàn tác thao tác vừa rồi (Ctrl + Z)"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-rail)]/70 px-2.5 py-1 font-mono text-xs text-[var(--ink)] transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-white/5"
        >
          <span>↶</span>
          <span>Hoàn tác</span>
        </button>

        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title="Làm lại thao tác (Ctrl + Y)"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-rail)]/70 px-2.5 py-1 font-mono text-xs text-[var(--ink)] transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-white/5"
        >
          <span>↷</span>
          <span>Làm lại</span>
        </button>
      </div>

      <section className="ruled-lines w-full min-h-[calc(100dvh-15rem)] border-y border-[var(--border)]">
        <AnimatePresence initial={false}>
          {sortedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onAdvance={handleAdvance}
              onRevert={handleRevert}
              onDelete={deleteTask}
              showCreatedDate={showCreatedDate}
              isEvening={isEvening}
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