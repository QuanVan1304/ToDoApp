"use client";

import { useState } from "react";
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
  const { createTask } = useTasks({ enabled: false });
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[var(--bg-main)] text-[var(--ink)]">
      {/* Sidebar */}
      <Rail
        projects={projects}
        isAgentOpen={isAgentOpen}
        onToggleAgent={() => setIsAgentOpen((v) => !v)}
      />

      {/* Main content */}
      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <div className="min-h-full px-6 pb-32 pt-16 sm:px-10 lg:px-14">
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>

      {/* AI */}
      {isAgentOpen && <AgentPanel />}

      {/* Create task */}
      <CommandBar onSubmit={(title) => createTask(title)} />
    </div>
  );
}