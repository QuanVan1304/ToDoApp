"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { TaskItem } from "./TaskItem";
import { TaskDetailModal } from "./TaskDetailModal";
import { useTasks } from "@/hooks/useTasks";
import {
  getDaysOld,
  getDaysUntilDue,
  isThisWeekVietnam,
  isTodayVietnam,
  isVietnamEvening,
} from "@/lib/utils";
import type { Priority, Status, TaskWithRelations } from "@/types";

function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

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
  splitActiveSections?: boolean;
}

const STATUS_RANK: Record<Status, number> = {
  TODO: 0,
  INPROGRESS: 1,
  DONE: 2,
};

const PRIORITY_RANK: Record<Priority, number> = {
  URGENT: 3,
  HIGH: 2,
  NORMAL: 1,
  LOW: 0,
};

export function TaskList({
  status,
  statuses,
  projectId,
  projectColor,
  todayOnly,
  showCreatedDate = false,
  splitActiveSections = false,
}: TaskListProps) {
  const {
    tasks,
    isLoading,
    updateTask,
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

  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(
    null,
  );

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
  const doneTasks = tasks.filter((t) => t.status === "DONE");
  const doneCount = doneTasks.length;
  const doneTodayCount = doneTasks.filter((t) =>
    isTodayVietnam(t.completedAt ?? t.updatedAt),
  ).length;
  const doneThisWeekCount = doneTasks.filter((t) =>
    isThisWeekVietnam(t.completedAt ?? t.updatedAt),
  ).length;
  const activeTasks = tasks.filter((t) => t.status !== "DONE");
  const untouchedCount = activeTasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = activeTasks.filter(
    (t) => t.status === "INPROGRESS",
  ).length;
  const donePercent =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const inProgressPercent =
    totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0;

  // Nhóm 1: Việc CÓ hạn chót (nhắc trước 1 ngày, đúng hạn, quá hạn)
  const overdueCount = activeTasks.filter((t) => {
    const d = getDaysUntilDue(t.dueDate);
    return d !== null && d < 0;
  }).length;
  const dueTodayCount = activeTasks.filter(
    (t) => getDaysUntilDue(t.dueDate) === 0,
  ).length;
  const dueTomorrowCount = activeTasks.filter(
    (t) => getDaysUntilDue(t.dueDate) === 1,
  ).length;
  const hasDeadlineAlert =
    overdueCount > 0 || dueTodayCount > 0 || dueTomorrowCount > 0;

  // Nhóm 2: Việc KHÔNG gắn hạn chót (áp dụng nhắc cuối ngày & cảnh báo ngâm 3–7 ngày)
  const noDueActiveTasks = activeTasks.filter((t) => !t.dueDate);
  const untouchedNoDueCount = noDueActiveTasks.filter(
    (t) => t.status === "TODO",
  ).length;
  const inProgressNoDueCount = noDueActiveTasks.filter(
    (t) => t.status === "INPROGRESS",
  ).length;
  const criticalCount = noDueActiveTasks.filter(
    (t) => getDaysOld(t.createdAt) >= 7,
  ).length;
  const warnCount = noDueActiveTasks.filter((t) => {
    const d = getDaysOld(t.createdAt);
    return d >= 3 && d < 7;
  }).length;

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (statusDiff !== 0) return statusDiff;

    if (a.status === "DONE") {
      const timeA = new Date(a.completedAt ?? a.updatedAt).getTime();
      const timeB = new Date(b.completedAt ?? b.updatedAt).getTime();
      if (timeA !== timeB) return timeB - timeA;
    } else {
      const priorityDiff =
        PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      const dueA = getDaysUntilDue(a.dueDate);
      const dueB = getDaysUntilDue(b.dueDate);
      const dueUrgencyA =
        dueA === null ? 0 : dueA < 0 ? 3 : dueA === 0 ? 2 : dueA === 1 ? 1 : 0;
      const dueUrgencyB =
        dueB === null ? 0 : dueB < 0 ? 3 : dueB === 0 ? 2 : dueB === 1 ? 1 : 0;
      if (dueUrgencyA !== dueUrgencyB) return dueUrgencyB - dueUrgencyA;
      if (dueA !== null && dueB !== null && dueA !== dueB) {
        return dueA - dueB;
      }

      const ageA = a.dueDate ? 0 : getDaysOld(a.createdAt);
      const ageB = b.dueDate ? 0 : getDaysOld(b.createdAt);
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
      {status === "DONE" && totalCount > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[var(--border)] bg-[var(--bg-rail)]/55 px-4 py-2.5 font-mono text-xs text-[var(--ink-muted)]">
          <span>
            Hôm nay:{" "}
            <strong className="font-semibold text-[var(--teal)]">
              {doneTodayCount} việc
            </strong>
          </span>
          <span className="opacity-40">·</span>
          <span>
            Tuần này:{" "}
            <strong className="font-semibold text-[var(--ink)]">
              {doneThisWeekCount} việc
            </strong>
          </span>
          <span className="opacity-40">·</span>
          <span>
            Tổng cộng:{" "}
            <strong className="font-semibold text-[var(--ink)]">
              {totalCount} việc đã hoàn thành
            </strong>
          </span>
        </div>
      )}

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

      {hasDeadlineAlert && (
        <div
          className={`mb-3 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm text-[var(--ink)] ${
            overdueCount > 0 || dueTodayCount > 0
              ? "border-[var(--brick)]/35 bg-[var(--brick)]/[0.06]"
              : "border-[var(--mustard)]/35 bg-[var(--mustard)]/[0.08]"
          }`}
        >
          <span
            className="mt-0.5 font-mono text-xs font-semibold"
            style={{
              color:
                overdueCount > 0 || dueTodayCount > 0
                  ? "var(--brick)"
                  : "var(--mustard)",
            }}
          >
            {overdueCount > 0 || dueTodayCount > 0 ? "⚡" : "⏰"}
          </span>

          <div className="min-w-0 flex-1 leading-relaxed">
            <span
              className="font-medium"
              style={{
                color:
                  overdueCount > 0 || dueTodayCount > 0
                    ? "var(--brick)"
                    : "var(--mustard)",
              }}
            >
              Nhắc hạn chót:{" "}
            </span>
            <span>
              Bạn đang có{" "}
              {[
                overdueCount > 0 ? `${overdueCount} việc đã quá hạn` : null,
                dueTodayCount > 0
                  ? `${dueTodayCount} việc đến hạn hôm nay`
                  : null,
                dueTomorrowCount > 0
                  ? `${dueTomorrowCount} việc hết hạn vào ngày mai`
                  : null,
              ]
                .filter(Boolean)
                .join(", ")}
              . Hãy ưu tiên hoàn thành sớm cho xong nhé!
            </span>
          </div>
        </div>
      )}

      {isEvening && noDueActiveTasks.length > 0 && (
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
              {untouchedNoDueCount > 0 && inProgressNoDueCount > 0 ? (
                <>
                  Bạn vẫn còn{" "}
                  <strong>{untouchedNoDueCount} việc chưa đụng tới</strong> và{" "}
                  <strong>{inProgressNoDueCount} việc chưa hoàn thành</strong>.
                  Hãy tranh thủ hoàn tất hoặc khởi động trước khi bước sang ngày
                  mới nhé!
                </>
              ) : untouchedNoDueCount > 0 ? (
                <>
                  Đã cuối ngày nhưng bạn vẫn còn{" "}
                  <strong>{untouchedNoDueCount} công việc chưa bắt đầu</strong>.
                  Hãy bấm <strong>Làm ngay</strong> hoặc tick ô vuông để khởi
                  động!
                </>
              ) : (
                <>
                  Bạn đang có{" "}
                  <strong>
                    {inProgressNoDueCount} công việc chưa hoàn thành
                  </strong>{" "}
                  — cố gắng làm cho xong trước khi kết thúc ngày hôm nay nhé!
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
                  . Hãy <strong>Làm ngay</strong> hoặc{" "}
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

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* Search bar */}
        <div className="relative w-full max-w-[260px]">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] opacity-60"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm công việc..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-rail)]/55 py-1 pl-8 pr-7 text-xs text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-muted)]/70 focus:border-[var(--mustard)]/60 focus:bg-[var(--bg-main)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink)]"
              aria-label="Xoá tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-2">
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
      </div>

      {(() => {
        const normalizedQuery = normalizeSearch(search);
        const visibleTasks = normalizedQuery
          ? sortedTasks.filter((task) => {
              const haystack = normalizeSearch(
                `${task.title} ${task.notes ?? ""} ${task.project?.name ?? ""}`,
              );
              return haystack.includes(normalizedQuery);
            })
          : sortedTasks;

        const renderTaskItem = (task: TaskWithRelations) => (
          <TaskItem
            key={task.id}
            task={task}
            onAdvance={handleAdvance}
            onRevert={handleRevert}
            onSelect={setSelectedTask}
            onDelete={deleteTask}
            showCreatedDate={showCreatedDate}
            isEvening={isEvening}
          />
        );

        if (splitActiveSections && visibleTasks.length > 0) {
          const todoVisible = visibleTasks.filter((t) => t.status === "TODO");
          const inProgressVisible = visibleTasks.filter(
            (t) => t.status === "INPROGRESS",
          );
          const inProgressDueCount = inProgressVisible.filter((t) =>
            Boolean(t.dueDate),
          ).length;

          return (
            <section className="ruled-lines w-full min-h-[calc(100dvh-15rem)] border-y border-[var(--border)]">
              {/* Khu vực 1: Việc chưa bắt đầu (Hôm nay & tồn TODO) */}
              {(!normalizedQuery || todoVisible.length > 0) && (
                <div>
                  <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-rail)]/40 px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--mustard)]" />
                      <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
                        Việc hôm nay · Chưa bắt đầu
                      </span>
                      <span className="rounded-full bg-black/6 px-1.5 py-0.2 font-mono text-[10px] text-[var(--ink)] dark:bg-white/10">
                        {todoVisible.length}
                      </span>
                    </div>
                  </div>

                  {todoVisible.length > 0 ? (
                    <AnimatePresence initial={false}>
                      {todoVisible.map(renderTaskItem)}
                    </AnimatePresence>
                  ) : (
                    <p className="border-b border-[var(--border)] px-3 py-3 font-serif text-xs italic text-[var(--ink-muted)]">
                      Chưa có việc mới nào cần bắt đầu — tập trung hoàn thành các
                      việc đang làm dở bên dưới nhé.
                    </p>
                  )}
                </div>
              )}

              {/* Khu vực 2: Việc đang làm dở & có hạn chót */}
              {inProgressVisible.length > 0 && (
                <div className={!normalizedQuery || todoVisible.length > 0 ? "mt-6" : ""}>
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 border-[var(--border)] bg-[var(--bg-rail)]/55 px-3 py-1.5 ${
                      !normalizedQuery || todoVisible.length > 0
                        ? "border-y"
                        : "border-b"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
                      <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--teal)]">
                        Đang làm dở &amp; Hạn chót
                      </span>
                      <span className="rounded-full bg-[var(--teal)]/14 px-1.5 py-0.2 font-mono text-[10px] font-medium text-[var(--teal)]">
                        {inProgressVisible.length}
                      </span>
                      {inProgressDueCount > 0 && (
                        <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                          · {inProgressDueCount} có hạn chót
                        </span>
                      )}
                    </div>

                    <Link
                      href="/in-progress"
                      className="font-mono text-[11px] text-[var(--ink-muted)] transition-colors hover:text-[var(--teal)]"
                    >
                      Mở tab Đang làm →
                    </Link>
                  </div>

                  <AnimatePresence initial={false}>
                    {inProgressVisible.map(renderTaskItem)}
                  </AnimatePresence>
                </div>
              )}
            </section>
          );
        }

        return (
          <section className="ruled-lines w-full min-h-[calc(100dvh-15rem)] border-y border-[var(--border)]">
            <AnimatePresence initial={false}>
              {visibleTasks.map(renderTaskItem)}
            </AnimatePresence>

            {visibleTasks.length === 0 && (
              <div className="flex min-h-[22rem] items-center justify-center px-6">
                <p className="max-w-md text-center font-serif text-lg leading-relaxed text-[var(--ink-muted)]">
                  {normalizedQuery
                    ? `Không tìm thấy công việc nào khớp với “${search.trim()}”.`
                    : status === "INPROGRESS"
                      ? "Chưa có công việc nào đang thực hiện."
                      : status === "DONE"
                        ? "Chưa có công việc nào trong lịch sử."
                        : "“Trang gi\u1EA5y tr\u1EAFng l\u00E0 s\u1EF1 kh\u1EDFi \u0111\u1EA7u t\u1ED1t nh\u1EA5t”"}
                </p>
              </div>
            )}
          </section>
        );
      })()}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={(updates) => updateTask(updates)}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}