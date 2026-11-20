import type { Priority, Status, Task, TaskSource } from "@/generated/prisma/client";

export type { Priority, Status, Task, TaskSource };

export type TaskWithRelations = Task & {
  tags: { id: string; name: string }[];
  project: { id: string; name: string; color: string | null } | null;
};

export interface ListTasksParams {
  status?: Status;
  statuses?: Status[];
  projectId?: string;
  tagIds?: string[];
  search?: string;
  todayOnly?: boolean;
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  status?: Status;
  priority?: Priority;
  scheduledFor?: string | Date;
  dueDate?: string | null; // ISO date string
  projectId?: string | null;
  tagIds?: string[];
  source?: TaskSource;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  status?: Status;
  priority?: Priority;
  dueDate?: string | null;
  projectId?: string | null;
  tagIds?: string[];
  order?: number;
}
