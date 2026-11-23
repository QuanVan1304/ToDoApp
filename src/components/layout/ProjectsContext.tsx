"use client";

import { createContext, useContext } from "react";

export interface ShellProject {
  id: string;
  name: string;
  color?: string | null;
  _count: { tasks: number };
}

const ProjectsContext = createContext<ShellProject[]>([]);

export function ProjectsProvider({
  projects,
  children,
}: {
  projects: ShellProject[];
  children: React.ReactNode;
}) {
  return (
    <ProjectsContext.Provider value={projects}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectsContext);
}
