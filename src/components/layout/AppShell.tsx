"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Rail } from "./Rail";
import { CommandBar } from "./CommandBar";
import { AgentPanel } from "@/components/ai/AgentPanel";
import { useTasks } from "@/hooks/useTasks";

interface AppShellProject {
  id: string;
  name: string;
  color?: string | null;
  _count: { tasks: number };
}

export function AppShell({
  projects,
  children,
}: {
  projects: AppShellProject[];
  children: React.ReactNode;
}) {
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const pathname = usePathname();
  const activeProjectId = pathname.startsWith("/projects/")
    ? pathname.split("/projects/")[1]?.split("/")[0]
    : undefined;
  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)
    : undefined;

  const { createTask } = useTasks({ enabled: false });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setIsAgentOpen((v) => !v);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[var(--bg-main)] text-[var(--ink)]">
      {/* Sidebar */}
      <Rail projects={projects} />

      {/* Main content */}
      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <div className="min-h-full px-6 pb-32 pt-16 sm:px-10 lg:px-14">
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>

      {/* AI */}
      {isAgentOpen && (
        <AgentPanel onClose={() => setIsAgentOpen(false)} />
      )}

      {/* Create task + AI Toggle */}
      <CommandBar
        placeholder={
          activeProject
            ? `Thêm đầu việc mới vào dự án “${activeProject.name}”...`
            : "Viết công việc mới..."
        }
        isAgentOpen={isAgentOpen}
        onToggleAgent={() => setIsAgentOpen((v) => !v)}
        onSubmit={(title) =>
          createTask({
            title,
            projectId: activeProject?.id ?? null,
            project: activeProject
              ? {
                  id: activeProject.id,
                  name: activeProject.name,
                  color: activeProject.color ?? null,
                }
              : null,
          })
        }
      />
    </div>
  );
}
