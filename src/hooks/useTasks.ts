// src/hooks/useTasks.ts
"use client";

import { useSyncExternalStore } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Priority, Status, TaskWithRelations } from "@/types";

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

type HistoryAction =
  | {
      type: "create";
      task: TaskWithRelations;
    }
  | {
      type: "delete";
      task: TaskWithRelations;
    }
  | {
      type: "status";
      taskId: string;
      title: string;
      fromStatus: Status;
      toStatus: Status;
    };

interface HistorySnapshot {
  undoStack: HistoryAction[];
  redoStack: HistoryAction[];
}

let historySnapshot: HistorySnapshot = {
  undoStack: [],
  redoStack: [],
};

const historyListeners = new Set<() => void>();
const cancelledTempIds = new Set<string>();
const HISTORY_TTL_MS = 5 * 60_000;
let historyTtlTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleHistoryCleanup() {
  if (historyTtlTimer) {
    clearTimeout(historyTtlTimer);
  }
  historyTtlTimer = setTimeout(() => {
    if (
      historySnapshot.undoStack.length > 0 ||
      historySnapshot.redoStack.length > 0
    ) {
      historySnapshot = { undoStack: [], redoStack: [] };
      emitHistoryChange();
    }
  }, HISTORY_TTL_MS);
}

function emitHistoryChange() {
  for (const listener of historyListeners) {
    listener();
  }
}

function subscribeHistory(listener: () => void) {
  historyListeners.add(listener);
  return () => {
    historyListeners.delete(listener);
  };
}

function getHistorySnapshot(): HistorySnapshot {
  return historySnapshot;
}

function pushUndoAction(action: HistoryAction) {
  historySnapshot = {
    undoStack: [...historySnapshot.undoStack.slice(-29), action],
    redoStack: [],
  };
  scheduleHistoryCleanup();
  emitHistoryChange();
}

function replaceTaskInHistory(oldId: string, newTask: TaskWithRelations) {
  const mapAction = (entry: HistoryAction): HistoryAction => {
    if (
      (entry.type === "create" || entry.type === "delete") &&
      entry.task.id === oldId
    ) {
      return { ...entry, task: newTask };
    }
    if (entry.type === "status" && entry.taskId === oldId) {
      return { ...entry, taskId: newTask.id };
    }
    return entry;
  };

  historySnapshot = {
    undoStack: historySnapshot.undoStack.map(mapAction),
    redoStack: historySnapshot.redoStack.map(mapAction),
  };
  emitHistoryChange();
}

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

function removeTaskAcrossCaches(queryClient: QueryClient, taskId: string) {
  queryClient.setQueriesData<TaskWithRelations[]>(
    { queryKey: ["tasks"] },
    (old) => old?.filter((task) => task.id !== taskId),
  );
}

function findTaskInCaches(
  queryClient: QueryClient,
  taskId: string,
): TaskWithRelations | undefined {
  const queries = queryClient.getQueriesData<TaskWithRelations[]>({
    queryKey: ["tasks"],
  });
  for (const [, list] of queries) {
    const found = list?.find((item) => item.id === taskId);
    if (found) return found;
  }
  return undefined;
}

export function useTasks(options: UseTasksOptions = {}) {
  const queryClient = useQueryClient();
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getHistorySnapshot,
  );

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

  type CreateTaskArg =
    | string
    | {
        title: string;
        projectId?: string | null;
        project?: { id: string; name: string; color: string | null } | null;
      };

  const createMutation = useMutation({
    mutationFn: (arg: CreateTaskArg) => {
      const title = typeof arg === "string" ? arg : arg.title;
      const projectId =
        (typeof arg === "string" ? undefined : arg.projectId) ??
        options.projectId ??
        undefined;
      return apiClient.post<TaskWithRelations>("/api/tasks", {
        title,
        ...(projectId ? { projectId } : {}),
      });
    },

    onMutate: async (arg) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      const previousQueries = queryClient.getQueriesData<TaskWithRelations[]>({
        queryKey: ["tasks"],
      });

      const title = typeof arg === "string" ? arg : arg.title;
      const projectId =
        (typeof arg === "string" ? undefined : arg.projectId) ??
        options.projectId ??
        null;
      const projectObj =
        typeof arg === "string" ? null : (arg.project ?? null);

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
        projectId,
        createdAt: now,
        updatedAt: now,
        tags: [],
        project: projectObj,
      };

      upsertTaskAcrossCaches(queryClient, optimisticTask);
      pushUndoAction({ type: "create", task: optimisticTask });

      return { previousQueries, tempId };
    },

    onSuccess: (createdTask, _title, context) => {
      const tempId = context?.tempId;
      if (tempId && cancelledTempIds.has(tempId)) {
        cancelledTempIds.delete(tempId);
        replaceTaskInHistory(tempId, createdTask);
        void apiClient.delete(`/api/tasks/${createdTask.id}`);
        return;
      }

      if (tempId) {
        replaceTaskInHistory(tempId, createdTask);
      }
      upsertTaskAcrossCaches(queryClient, createdTask, tempId);
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
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Status;
      skipHistory?: boolean;
    }) =>
      apiClient.patch<TaskWithRelations>(`/api/tasks/${id}`, {
        status,
      }),

    onMutate: async ({ id, status, skipHistory }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      const previousQueries = queryClient.getQueriesData<TaskWithRelations[]>({
        queryKey: ["tasks"],
      });

      const existing = findTaskInCaches(queryClient, id);

      if (existing) {
        if (!skipHistory && existing.status !== status) {
          pushUndoAction({
            type: "status",
            taskId: existing.id,
            title: existing.title,
            fromStatus: existing.status,
            toStatus: status,
          });
        }

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

      const existing = findTaskInCaches(queryClient, id);
      if (existing) {
        pushUndoAction({ type: "delete", task: existing });
      }

      removeTaskAcrossCaches(queryClient, id);

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

  type UpdateTaskArg = {
    id: string;
    title?: string;
    notes?: string | null;
    status?: Status;
    priority?: Priority;
    dueDate?: string | null;
    projectId?: string | null;
    project?: { id: string; name: string; color: string | null } | null;
  };

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, project: _project, ...body }: UpdateTaskArg) => {
      void _project;
      return apiClient.patch<TaskWithRelations>(`/api/tasks/${id}`, body);
    },

    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      const previousQueries = queryClient.getQueriesData<TaskWithRelations[]>({
        queryKey: ["tasks"],
      });

      const existing = findTaskInCaches(queryClient, updates.id);
      if (existing) {
        const nextStatus = updates.status ?? existing.status;
        if (updates.status && existing.status !== updates.status) {
          pushUndoAction({
            type: "status",
            taskId: existing.id,
            title: updates.title?.trim() || existing.title,
            fromStatus: existing.status,
            toStatus: updates.status,
          });
        }

        upsertTaskAcrossCaches(queryClient, {
          ...existing,
          ...(updates.title !== undefined && { title: updates.title.trim() }),
          ...(updates.notes !== undefined && { notes: updates.notes }),
          ...(updates.status !== undefined && {
            status: nextStatus,
            completedAt: nextStatus === "DONE" ? new Date() : null,
            scheduledFor:
              nextStatus === "INPROGRESS" ? new Date() : existing.scheduledFor,
          }),
          ...(updates.priority !== undefined && { priority: updates.priority }),
          ...(updates.dueDate !== undefined && {
            dueDate: updates.dueDate ? new Date(updates.dueDate) : null,
          }),
          ...(updates.projectId !== undefined && {
            projectId: updates.projectId,
            project: updates.project ?? null,
          }),
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

  async function restoreTaskToServer(task: TaskWithRelations) {
    const oldId = task.id;
    upsertTaskAcrossCaches(queryClient, task);

    try {
      const recreated = await apiClient.post<TaskWithRelations>("/api/tasks", {
        title: task.title,
        notes: task.notes ?? undefined,
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
      });
      replaceTaskInHistory(oldId, recreated);
      upsertTaskAcrossCaches(queryClient, recreated, oldId);
    } catch {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  }

  function removeTaskFromServer(task: TaskWithRelations) {
    removeTaskAcrossCaches(queryClient, task.id);
    if (task.id.startsWith("temp-")) {
      cancelledTempIds.add(task.id);
      return;
    }
    void apiClient.delete(`/api/tasks/${task.id}`).catch(() => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    });
  }

  function undo() {
    const { undoStack, redoStack } = historySnapshot;
    if (undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];
    historySnapshot = {
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, action],
    };
    emitHistoryChange();

    if (action.type === "create") {
      removeTaskFromServer(action.task);
    } else if (action.type === "delete") {
      void restoreTaskToServer(action.task);
    } else if (action.type === "status") {
      statusMutation.mutate({
        id: action.taskId,
        status: action.fromStatus,
        skipHistory: true,
      });
    }
  }

  function redo() {
    const { undoStack, redoStack } = historySnapshot;
    if (redoStack.length === 0) return;

    const action = redoStack[redoStack.length - 1];
    historySnapshot = {
      undoStack: [...undoStack, action],
      redoStack: redoStack.slice(0, -1),
    };
    emitHistoryChange();

    if (action.type === "create") {
      void restoreTaskToServer(action.task);
    } else if (action.type === "delete") {
      removeTaskFromServer(action.task);
    } else if (action.type === "status") {
      statusMutation.mutate({
        id: action.taskId,
        status: action.toStatus,
        skipHistory: true,
      });
    }
  }

  return {
    tasks: data ?? [],
    isLoading,
    createTask: createMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    updateTaskStatus: ({ id, status }: { id: string; status: Status }) =>
      statusMutation.mutate({ id, status }),
    deleteTask: deleteMutation.mutate,
    canUndo: history.undoStack.length > 0,
    canRedo: history.redoStack.length > 0,
    undo,
    redo,
  };
}
