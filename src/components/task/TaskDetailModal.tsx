"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useProjects } from "@/components/layout/ProjectsContext";
import { formatFullDate } from "@/lib/utils";
import type { Priority, Status, TaskWithRelations } from "@/types";

interface TaskDetailModalProps {
  task: TaskWithRelations;
  onClose: () => void;
  onSave: (updates: {
    id: string;
    title: string;
    notes: string | null;
    status: Status;
    priority: Priority;
    dueDate: string | null;
    projectId: string | null;
    project: { id: string; name: string; color: string | null } | null;
  }) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "LOW", label: "Thấp", color: "var(--ink-muted)" },
  { value: "NORMAL", label: "Bình thường", color: "var(--teal)" },
  { value: "HIGH", label: "Cao", color: "var(--mustard)" },
  { value: "URGENT", label: "Khẩn cấp", color: "var(--brick)" },
];

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "TODO", label: "Chưa làm" },
  { value: "INPROGRESS", label: "Đang làm" },
  { value: "DONE", label: "Hoàn thành" },
];

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TaskDetailModal({
  task,
  onClose,
  onSave,
  onDelete,
}: TaskDetailModalProps) {
  const projects = useProjects();

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [status, setStatus] = useState<Status>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(() => toDateInputValue(task.dueDate));
  const [projectId, setProjectId] = useState<string>(task.projectId ?? "");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const selectedProject = projectId
      ? projects.find((p) => p.id === projectId) ?? null
      : null;

    onSave({
      id: task.id,
      title: trimmedTitle,
      notes: notes.trim() ? notes.trim() : null,
      status,
      priority,
      dueDate: dueDate || null,
      projectId: projectId || null,
      project: selectedProject
        ? {
            id: selectedProject.id,
            name: selectedProject.name,
            color: selectedProject.color ?? null,
          }
        : null,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[440px] flex-col border-l border-[var(--border)] bg-[var(--bg-main)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)]">
              Chi tiết công việc
            </span>
            {task.createdAt && (
              <span className="font-mono text-[11px] text-[var(--ink-muted)] opacity-70">
                · Tạo {formatFullDate(task.createdAt)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-xs text-[var(--ink-muted)] transition-colors hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/5"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
              Tên công việc
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên công việc..."
              autoFocus
              className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 font-serif text-base text-[var(--ink)] outline-none focus:border-[var(--mustard)]"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
              Trạng thái
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-all ${
                      active
                        ? "border-[var(--teal)] bg-[var(--teal)]/12 text-[var(--teal)]"
                        : "border-[var(--border)] text-[var(--ink-muted)] hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
              Mức độ ưu tiên
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const active = priority === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                      active
                        ? "border-[var(--ink)]/40 bg-[var(--bg-rail)] text-[var(--ink)] shadow-xs"
                        : "border-[var(--border)] text-[var(--ink-muted)] hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project & Due Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
                Thuộc dự án
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--mustard)]"
              >
                <option value="">Không thuộc dự án</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
                  Hạn chót
                </label>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="text-[10px] text-[var(--ink-muted)] hover:text-[var(--brick)]"
                  >
                    Xoá ngày
                  </button>
                )}
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-mono text-xs text-[var(--ink)] outline-none focus:border-[var(--mustard)]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
              Ghi chú chi tiết
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Ghi thêm chi tiết, đường link, các bước nhỏ cần nhớ..."
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-rail)]/40 px-3.5 py-2.5 text-sm leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]/60 focus:border-[var(--mustard)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
          <button
            type="button"
            onClick={() => {
              onDelete(task.id);
              onClose();
            }}
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--brick)] transition-colors hover:bg-[var(--brick)]/10"
          >
            Xoá công việc
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-2 text-xs text-[var(--ink-muted)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-lg bg-[var(--ink)] px-4 py-2 text-xs font-medium text-[var(--bg-main)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
