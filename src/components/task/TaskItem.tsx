"use client";

import { motion } from "framer-motion";
import { TaskCheckbox } from "./TaskCheckbox";
import {
  formatDate,
  formatFullDate,
  getDaysOld,
  getDaysUntilDue,
  isBeforeToday,
} from "@/lib/utils";
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
  onRevert?: (id: string, currentStatus: Status) => void;
  onSelect?: (task: TaskWithRelations) => void;
  onDelete: (id: string) => void;
  showCreatedDate?: boolean | "past-only";
  isEvening?: boolean;
}

export function TaskItem({
  task,
  onAdvance,
  onRevert,
  onSelect,
  onDelete,
  showCreatedDate = false,
  isEvening: isEveningProp = false,
}: TaskItemProps) {
  const isPending = task.id.startsWith("temp-");
  const isDone = task.status === "DONE";
  const isInProgress = task.status === "INPROGRESS";
  const isUrgent = !isDone && task.priority === "URGENT";
  const isHigh = !isDone && task.priority === "HIGH";
  const isLow = !isDone && task.priority === "LOW";

  const hasDueDate = Boolean(task.dueDate);
  const daysUntilDue =
    !isDone && hasDueDate ? getDaysUntilDue(task.dueDate) : null;
  const isDueOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isDueToday = daysUntilDue === 0;
  const isDueTomorrow = daysUntilDue === 1;
  const isDueSoon = isDueOverdue || isDueToday || isDueTomorrow;

  // Nhắc cuối ngày (20:00) chỉ áp dụng cho việc KHÔNG gắn hạn chót
  const isEvening = !isDone && !hasDueDate && isEveningProp;

  // Cảnh báo ngâm lâu (3–7 ngày) chỉ áp dụng cho việc KHÔNG gắn hạn chót
  const daysOld = !isDone && task.createdAt ? getDaysOld(task.createdAt) : 0;
  const isAgingWarn = !hasDueDate && daysOld >= 3 && daysOld < 7;
  const isAgingCritical = !hasDueDate && daysOld >= 7;

  const isCriticalVisual =
    isUrgent || isDueOverdue || isDueToday || isAgingCritical;
  const isWarnVisual =
    !isCriticalVisual && (isHigh || isDueTomorrow || isAgingWarn);

  const shouldShowCreatedDate =
    Boolean(task.createdAt) &&
    (showCreatedDate === true ||
      (showCreatedDate === "past-only" && isBeforeToday(task.createdAt)));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{
        opacity: isDone ? 0.55 : isPending ? 0.75 : isLow ? 0.78 : 1,
        y: 0,
      }}
      exit={{ opacity: 0, x: 16 }}
      className={`group flex items-start gap-[0.6rem] border-b border-[var(--border)] py-[0.7rem] pr-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
        isUrgent || isDueOverdue
          ? "border-l-2 border-l-[var(--brick)] bg-[var(--brick)]/[0.045] pl-2.5"
          : isCriticalVisual
            ? "border-l-2 border-l-[var(--brick)] pl-2.5"
            : isWarnVisual
              ? "border-l-2 border-l-[var(--mustard)] pl-2.5"
              : ""
      }`}
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
          isCriticalVisual ? "animate-pulse" : ""
        }`}
        style={{
          backgroundColor: isCriticalVisual
            ? "var(--brick)"
            : PRIORITY_COLOR[task.priority],
          boxShadow: isInProgress
            ? "0 0 0 3px color-mix(in srgb, var(--teal) 18%, transparent)"
            : undefined,
        }}
      />

      <div
        onClick={() => {
          if (!isPending && onSelect) {
            onSelect(task);
          }
        }}
        className={`min-w-0 flex-1 ${!isPending && onSelect ? "cursor-pointer" : ""}`}
        title={!isPending && onSelect ? "Bấm để xem & chỉnh sửa chi tiết" : undefined}
      >
        <div
          className={`font-sans text-[0.93rem] leading-[1.45] text-[var(--ink)] ${
            isUrgent ? "font-medium" : ""
          }`}
        >
          <span className={isDone ? "task-strike" : ""}>
            {task.title}
          </span>

          {isUrgent && (
            <span className="ml-2 inline-flex items-center rounded bg-[var(--brick)]/14 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--brick)]">
              ! Khẩn cấp
            </span>
          )}

          {isHigh && (
            <span className="ml-2 inline-flex items-center rounded bg-[var(--mustard)]/16 px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--mustard)]">
              ↑ Cao
            </span>
          )}

          {isInProgress && (
            <span className="ml-2 inline-flex rounded-full bg-[var(--teal)]/12 px-2 py-0.5 text-[10px] font-medium text-[var(--teal)]">
              Đang làm
            </span>
          )}

          {task.project && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-rail)]/70 px-2 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: task.project.color || "var(--mustard)",
                }}
              />
              {task.project.name}
            </span>
          )}
        </div>

        {task.notes && (
          <p
            className="mt-0.5 truncate font-sans text-[0.78rem] text-[var(--ink-muted)] opacity-80"
            title={task.notes}
          >
            ✎ {task.notes.replace(/\s*\n+\s*/g, " · ")}
          </p>
        )}

        {(shouldShowCreatedDate || isEvening || isDueSoon) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[0.7rem] text-[var(--ink-muted)]">
            {shouldShowCreatedDate && (
              <>
                <span>{formatFullDate(task.createdAt)}</span>

                {isAgingCritical && (
                  <span className="inline-flex items-center rounded bg-[var(--brick)]/12 px-1.5 py-0.2 font-sans text-[10px] font-medium text-[var(--brick)]">
                    Tồn {daysOld} ngày
                  </span>
                )}

                {isAgingWarn && (
                  <span className="inline-flex items-center rounded bg-[var(--mustard)]/15 px-1.5 py-0.2 font-sans text-[10px] font-medium text-[var(--mustard)]">
                    Ngâm {daysOld} ngày
                  </span>
                )}

                {!isDone && !hasDueDate && daysOld >= 1 && daysOld < 3 && (
                  <span>· {daysOld} ngày trước</span>
                )}
              </>
            )}

            {isDueSoon && daysUntilDue !== null && (
              <span
                className={`font-sans text-[0.72rem] font-medium ${
                  isDueOverdue || isDueToday
                    ? "text-[var(--brick)]"
                    : "text-[var(--mustard)]"
                }`}
              >
                {shouldShowCreatedDate ? "· " : ""}
                {isDueOverdue
                  ? `⚠ Đã quá hạn ${Math.abs(daysUntilDue)} ngày — cần xử lý gấp`
                  : isDueToday
                    ? "⚡ Hôm nay là hạn chót — cố gắng hoàn thành cho xong hôm nay!"
                    : "⏰ Ngày mai đến hạn — hãy tranh thủ hoàn thành sớm nhé"}
              </span>
            )}

            {isEvening && (
              <span
                className={`font-sans text-[0.72rem] ${
                  isInProgress
                    ? "text-[var(--teal)]"
                    : "text-[var(--mustard)]"
                }`}
              >
                {shouldShowCreatedDate ? "· " : ""}
                {isInProgress
                  ? "◷ Đang làm dở — cố hoàn thành nốt trong hôm nay"
                  : "☾ Cuối ngày rồi — việc này chưa được đụng tới"}
              </span>
            )}
          </div>
        )}
      </div>

      {task.dueDate && (
        <span
          className="mt-[2px] shrink-0 font-mono text-[0.72rem]"
          style={{
            color:
              isDueOverdue || isDueToday
                ? "var(--brick)"
                : isDueTomorrow
                  ? "var(--mustard)"
                  : "var(--ink-muted)",
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

      {!isPending &&
        !isDone &&
        (isAgingWarn || isAgingCritical || isEvening || isDueSoon) && (
          <button
            type="button"
            onClick={() => onAdvance(task.id, task.status)}
            className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[11px] font-medium transition-opacity ${
              isAgingCritical || isDueOverdue || isDueToday
                ? "bg-[var(--brick)]/12 text-[var(--brick)] opacity-90 hover:opacity-100"
                : "bg-[var(--mustard)]/15 text-[var(--mustard)] opacity-0 group-hover:opacity-90 hover:!opacity-100"
            }`}
          >
            {isInProgress ? "Xong ngay" : "Làm ngay"}
          </button>
        )}

      {!isPending && onRevert && (isInProgress || isDone) && (
        <button
          type="button"
          onClick={() => onRevert(task.id, task.status)}
          title={
            isDone
              ? "Chuyển lại về Đang làm"
              : "Chuyển lại về Chưa làm (Hôm nay)"
          }
          className="mt-0.5 shrink-0 text-[11px] text-[var(--ink-muted)] opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
        >
          ↶ Lùi
        </button>
      )}

      {!isPending && (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className={`mt-0.5 shrink-0 text-[11px] transition-opacity hover:!opacity-100 ${
            isAgingCritical
              ? "opacity-75"
              : "opacity-0 group-hover:opacity-60"
          }`}
          style={{ color: isAgingCritical ? "var(--brick)" : "var(--ink-muted)" }}
          aria-label={`Xoá công việc ${task.title}`}
        >
          Xoá
        </button>
      )}
    </motion.div>
  );
}