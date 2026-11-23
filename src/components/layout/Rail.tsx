"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const emptySubscribe = () => () => {};

interface RailProject {
  id: string;
  name: string;
  color?: string | null;
  _count: { tasks: number };
}

interface RailProps {
  projects: RailProject[];
}

export function Rail({
  projects,
}: RailProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState("#D9A441");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState("");
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const isToday = pathname === "/today";
  const isInProgress = pathname === "/in-progress";
  const isHistory = pathname === "/history";
  
  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) {
      setProjectError("Vui lòng nhập tên dự án.");
      return;
    }

    setIsCreatingProject(true);
    setProjectError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          color: projectColor,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Không thể tạo dự án.");
      }

      setProjectName("");
      setProjectColor("#D9A441");
      setIsProjectDialogOpen(false);

      // AppLayout chạy lại listProjects(), project mới sẽ hiện trong Rail.
      router.refresh();
    } catch (error) {
      setProjectError(
        error instanceof Error ? error.message : "Không thể tạo dự án.",
      );
    } finally {
      setIsCreatingProject(false);
    }
  }

  return (
    <aside className="flex h-screen w-[248px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-rail)]">
      {/* Brand */}
      <div className="px-6 pb-6 pt-7">
        <Link
          href="/today"
          className="group flex items-center gap-3"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--ink)] text-[var(--bg-rail)] shadow-sm">
            <span className="text-[15px] font-semibold">N</span>
          </div>

          <div className="min-w-0">
            <div className="font-serif text-[1.05rem] font-semibold tracking-[-0.02em]">
              Notebook
            </div>

            <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Personal workspace
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="px-3">
        <Link
          href="/today"
          className={`group flex h-10 items-center gap-3 rounded-[9px] px-3 transition-all ${
            isToday
              ? "bg-[var(--bg-main)] text-[var(--ink)] shadow-sm"
              : "text-[var(--ink-muted)] hover:bg-black/[0.035] hover:text-[var(--ink)] dark:hover:bg-white/[0.035]"
          }`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-md ${
              isToday
                ? "bg-[var(--mustard)]/15 text-[var(--mustard)]"
                : "text-[var(--ink-muted)]"
            }`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="3" y="4" width="18" height="17" rx="3" />
              <path d="M8 2v4M16 2v4M3 9h18" />
              <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
            </svg>
          </span>

          <span className="flex-1 text-[0.84rem] font-medium">
            Hôm nay
          </span>

          {isToday && (
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--mustard)]" />
          )}
          
        </Link>
          <Link
            href="/in-progress"
            className={`group flex h-10 items-center gap-3 rounded-[9px] px-3 transition-all ${
              isInProgress
                ? "bg-[var(--bg-main)] text-[var(--ink)] shadow-sm"
                : "text-[var(--ink-muted)] hover:bg-black/[0.035] hover:text-[var(--ink)] dark:hover:bg-white/[0.035]"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-md ${
                isInProgress
                  ? "bg-[var(--teal)]/15 text-[var(--teal)]"
                  : "text-[var(--ink-muted)]"
              }`}
            >
              ◷
            </span>

            <span className="flex-1 text-[0.84rem] font-medium">
              Đang làm
            </span>

            {isInProgress && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            )}
          </Link>

          <Link
            href="/history"
            className={`mt-1 group flex h-10 items-center gap-3 rounded-[9px] px-3 transition-all ${
              isHistory
                ? "bg-[var(--bg-main)] text-[var(--ink)] shadow-sm"
                : "text-[var(--ink-muted)] hover:bg-black/[0.035] hover:text-[var(--ink)] dark:hover:bg-white/[0.035]"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-md ${
                isHistory
                  ? "bg-[var(--brick)]/15 text-[var(--brick)]"
                  : "text-[var(--ink-muted)]"
              }`}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>

            <span className="flex-1 text-[0.84rem] font-medium">
              Lịch sử
            </span>

            {isHistory && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brick)]" />
            )}
          </Link>
      </nav>

      {/* Projects */}
      <div className="mt-8 flex-1 overflow-y-auto px-3">
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-muted)]">
            Dự án
          </span>

          <button
            type="button"
            onClick={() => {
              setProjectError("");
              setIsProjectDialogOpen(true);
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-[var(--ink-muted)] transition-colors hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/5"
            aria-label="Tạo dự án"
          >
            +
          </button>
        </div>

        <div className="space-y-0.5">
          {projects.map((project) => {
            const active = pathname === `/projects/${project.id}`;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={`group flex h-9 items-center gap-3 rounded-[8px] px-3 transition-colors ${
                  active
                    ? "bg-[var(--bg-main)] text-[var(--ink)]"
                    : "text-[var(--ink-muted)] hover:bg-black/[0.035] hover:text-[var(--ink)] dark:hover:bg-white/[0.035]"
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      project.color || "var(--mustard)",
                  }}
                />

                <span className="min-w-0 flex-1 truncate text-[0.81rem]">
                  {project.name}
                </span>

                {project._count.tasks > 0 && (
                  <span className="text-[10px] tabular-nums opacity-40">
                    {project._count.tasks}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Bottom */}
      <div className="border-t border-[var(--border)] p-3">
        <button
          onClick={() =>
            setTheme(theme === "dark" ? "light" : "dark")
          }
          className="flex h-9 w-full items-center gap-3 rounded-[8px] px-3 text-[var(--ink-muted)] transition-colors hover:bg-black/[0.035] hover:text-[var(--ink)] dark:hover:bg-white/[0.035]"
        >
          <span className="flex h-6 w-6 items-center justify-center">
            {mounted ? (
              theme === "dark" ? (
                "☼"
              ) : (
                "☾"
              )
            ) : (
              "·"
            )}
          </span>

          <span className="text-[0.78rem]">
            {mounted
              ? theme === "dark"
                ? "Chế độ sáng"
                : "Chế độ tối"
              : "Giao diện"}
          </span>
        </button>
      </div>
      {isProjectDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateProject}
            className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-main)] p-5 shadow-2xl"
          >
            <div className="mb-5">
              <h2 className="font-serif text-xl text-[var(--ink)]">
                Dự án mới
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Gom các công việc liên quan vào cùng một nơi.
              </p>
            </div>

            <label className="block text-xs font-medium text-[var(--ink-muted)]">
              Tên dự án
              <input
                autoFocus
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Ví dụ: Học tiếng Anh"
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--mustard)]"
              />
            </label>

            <label className="mt-4 block text-xs font-medium text-[var(--ink-muted)]">
              Màu nhận diện
              <input
                type="color"
                value={projectColor}
                onChange={(event) => setProjectColor(event.target.value)}
                className="mt-2 block h-10 w-full cursor-pointer rounded-lg border border-[var(--border)] bg-transparent p-1"
              />
            </label>

            {projectError && (
              <p className="mt-3 text-sm text-[var(--brick)]">
                {projectError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsProjectDialogOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-[var(--ink-muted)] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Huỷ
              </button>

              <button
                type="submit"
                disabled={isCreatingProject}
                className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--bg-main)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingProject ? "Đang tạo..." : "Tạo dự án"}
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}