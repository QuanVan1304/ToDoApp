// src/hooks/useTasks.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { TaskWithRelations, Status } from "@/types";

interface UseTasksOptions {
  status?: Status;
  statuses?: Status[];
  projectId?: string;
  todayOnly?: boolean;
  enabled?: boolean;
}

const STATUS_RANK: Record<Status, number> = {
  TODO: 0,
  INPROGRESS: 1,
  DONE: 2,
};

function sortTasks(tasks: TaskWithRelations[]): TaskWithRelations[] {
  return [...tasks].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.order - b.order,
  );
}

function matchesQueryKey(
  task: TaskWithRelations,
  qKey: readonly unknown[],
): boolean {
  if (qKey[0] !== "tasks") return false;

  const statusFilter = qKey[1] as string | undefined;
  const statusesFilter = qKey[2] as string | undefined;
  const projectIdFilter = qKey[3] as string | undefined;

  if (statusFilter && statusFilter !== "all" && task.status !== statusFilter) {
    return false;
  }

  if (
    statusesFilter &&
    statusesFilter !== "all" &&
    !statusesFilter.split(",").includes(task.status)
  ) {
    return false;
  }

  if (
    projectIdFilter &&
    projectIdFilter !== "all" &&
    task.projectId !== projectIdFilter
  ) {
    return false;
  }

  return true;
}

function upsertTaskAcrossCaches(
  queryClient: QueryClient,
  task: TaskWithRelations,
  replaceId?: string,
) {
  const queries = queryClient.getQueriesData<TaskWithRelations[]>({
    queryKey: ["tasks"],
  });

  for (const [qKey, old] of queries) {
    if (!old) continue;

    const filtered = old.filter(
      (item) => item.id !== task.id && (!replaceId || item.id !== replaceId),
    );

    if (matchesQueryKey(task, qKey)) {
      queryClient.setQueryData<TaskWithRelations[]>(
        qKey,
        sortTasks([...filtered, task]),
      );
    } else if (filtered.length !== old.length) {
      queryClient.setQueryData<TaskWithRelations[]>(qKey, filtered);
    }
  }
}

export function useTasks(options: UseTasksOptions = {}) {
  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);

  if (options.statuses?.length) {
    params.set("statuses", options.statuses.join(","));
  }

  if (options.todayOnly) {
    params.set("todayOnly", "true");
  }

  if (options.projectId) params.set("projectId", options.projectId);

  const queryKey = [
    "tasks",
    options.status ?? "all",
    options.statuses?.join(",") ?? "all",
    options.projectId ?? "all",
    options.todayOnly ? "today" : "all-days",
  ] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      apiClient.get<TaskWithRelations[]>(`/api/tasks?${params.toString()}`),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      apiClient.post<TaskWithRelations>("/api/tasks", { title }),

    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      const previousQueries = queryClient.getQueriesData<TaskWithRelations[]>({
        queryKey: ["tasks"],
      });

      const now = new Date();
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimisticTask: TaskWithRelations = {
        id: tempId,
        title: title.trim(),
        notes: null,
        status: "TODO",
        priority: "NORMAL",
        scheduledFor: now,
        dueDate: null,
        completedAt: null,
        order: Date.now(),
        source: "MANUAL",
        userId: "",
        projectId: null,
        createdAt: now,
        updatedAt: now,
        tags: [],
        project: null,
      };

      upsertTaskAcrossCaches(queryClient, optimisticTask);

      return { previousQueries, tempId };
    },

    onSuccess: (createdTask, _title, context) => {
      upsertTaskAcrossCaches(queryClient, createdTask, context?.tempId);
    },

    onError: (_error, _title, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([k, prev]) => {
          queryClient.setQueryData(k, prev);
        });
      }
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) =>
      apiClient.patch<TaskWithRelations>(`/api/tasks/${id}`, {
        status,
      }),

    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      const previousQueries = queryClient.getQueriesData<TaskWithRelations[]>({
        queryKey: ["tasks"],
      });

      let existing: TaskWithRelations | undefined;
      for (const [, list] of previousQueries) {
        const found = list?.find((item) => item.id === id);
        if (found) {
          existing = found;
          break;
        }
      }

      if (existing) {
        upsertTaskAcrossCaches(queryClient, {
          ...existing,
          status,
          completedAt: status === "DONE" ? new Date() : null,
          scheduledFor:
            status === "INPROGRESS" ? new Date() : existing.scheduledFor,
        });
      }

      return { previousQueries };
    },

    onSuccess: (updatedTask) => {
      upsertTaskAcrossCaches(queryClient, updatedTask);
    },

    onError: (_error, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([k, prev]) => {
          queryClient.setQueryData(k, prev);
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/tasks/${id}`),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      const previousQueries = queryClient.getQueriesData<TaskWithRelations[]>({
        queryKey: ["tasks"],
      });

      queryClient.setQueriesData<TaskWithRelations[]>(
        { queryKey: ["tasks"] },
        (old) => old?.filter((task) => task.id !== id),
      );

      return { previousQueries };
    },

    onError: (_error, _id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([k, prev]) => {
          queryClient.setQueryData(k, prev);
        });
      }
    },
  });

  return {
    tasks: data ?? [],
    isLoading,
    createTask: createMutation.mutate,
    updateTaskStatus: statusMutation.mutate,
    deleteTask: deleteMutation.mutate,
  };
}
