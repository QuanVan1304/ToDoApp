import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type {
  CreateTaskInput,
  ListTasksParams,
  TaskWithRelations,
  UpdateTaskInput,
} from "@/types";

export type TaskCandidate = {
  id: string;
  title: string;
  status: "TODO" | "INPROGRESS" | "DONE";
  score: number;
};

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  const rows = b.length + 1;
  const columns = a.length + 1;

  const matrix = Array.from(
    { length: rows },
    (_, row) => [row],
  );

  for (let column = 0; column < columns; column++) {
    matrix[0][column] = column;
  }

  for (let row = 1; row < rows; row++) {
    for (let column = 1; column < columns; column++) {
      const cost = a[column - 1] === b[row - 1] ? 0 : 1;

      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
}

function tokenScore(queryToken: string, titleTokens: string[]) {
  return Math.max(
    ...titleTokens.map((titleToken) => {
      if (titleToken === queryToken) return 1;

      if (
        titleToken.startsWith(queryToken) ||
        queryToken.startsWith(titleToken)
      ) {
        return 0.85;
      }

      const distance = levenshtein(queryToken, titleToken);
      const maxLength = Math.max(
        queryToken.length,
        titleToken.length,
      );

      return maxLength === 0
        ? 0
        : 1 - distance / maxLength;
    }),
    0,
  );
}

export async function findTaskCandidates(
  userId: string,
  query: string,
): Promise<TaskCandidate[]> {
  const normalizedQuery = normalizeSearchText(query);

  const queryTokens = normalizedQuery
    .split(" ")
    .filter(Boolean);

  if (queryTokens.length === 0) {
    return [];
  }

  const tasks = await prisma.task.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  return tasks
    .map((task) => {
      const titleTokens = normalizeSearchText(task.title)
        .split(" ")
        .filter(Boolean);

      const averageScore =
        queryTokens.reduce(
          (total, token) =>
            total + tokenScore(token, titleTokens),
          0,
        ) / queryTokens.length;

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        score: averageScore,
      };
    })
    .filter((task) => task.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
const taskInclude = {
  tags: { select: { id: true, name: true } },
  project: { select: { id: true, name: true, color: true } },
} satisfies Prisma.TaskInclude;

const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";
function toVietnamDateOnly(value: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const getNumber = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(
    Date.UTC(
      getNumber("year"),
      getNumber("month") - 1,
      getNumber("day"),
    ),
  );
}
function parseScheduledFor(value: string | Date) {
  if (value instanceof Date) {
    return toVietnamDateOnly(value);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  return toVietnamDateOnly(new Date(value));
}
function todayBounds() {
  const start = toVietnamDateOnly();

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export async function listTasks(
  userId: string,
  params: ListTasksParams = {},
  ): Promise<TaskWithRelations[]> {
    const {
    status,
    statuses,
    projectId,
    tagIds,
    search,
    todayOnly,
  } = params;
  const { end } = todayBounds();

  const where: Prisma.TaskWhereInput = {
    userId,

    ...(status && { status }),

    ...(statuses?.length && {
      status: {
        in: statuses,
      },
    }),

    // Tự động dồn việc tồn từ các ngày trước sang Hôm nay (scheduledFor < 00:00 ngày mai)
    ...(todayOnly && {
      scheduledFor: {
        lt: end,
      },
    }),

    ...(projectId && { projectId }),

    ...(tagIds?.length && {
      tags: {
        some: {
          id: { in: tagIds },
        },
      },
    }),

    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  return prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ status: "asc" }, { order: "asc" }],
  });
}

export async function getTask(
  userId: string,
  taskId: string,
): Promise<TaskWithRelations | null> {
  return prisma.task.findFirst({
    where: { id: taskId, userId },
    include: taskInclude,
  });
}

export async function createTask(
  userId: string,
  input: CreateTaskInput,
): Promise<TaskWithRelations> {
  if (!input.title?.trim()) {
    throw new ServiceError("VALIDATION", "Title không được để trống");
  }

  const status = input.status ?? "TODO";

  return prisma.task.create({
    data: {
      title: input.title.trim(),
      notes: input.notes,
      status,
      priority: input.priority ?? "NORMAL",
      scheduledFor: input.scheduledFor
        ? parseScheduledFor(input.scheduledFor)
        : toVietnamDateOnly(),
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      completedAt: status === "DONE" ? new Date() : null,
      order: Date.now(),
      source: input.source ?? "MANUAL",
      userId,
      projectId: input.projectId ?? null,
      ...(input.tagIds?.length && {
        tags: { connect: input.tagIds.map((id) => ({ id })) },
      }),
    },
    include: taskInclude,
  });
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskWithRelations> {
  try {
    return await prisma.task.update({
      where: {
        id_userId: {
          id: taskId,
          userId,
        },
      },
      data: {
        ...(input.title !== undefined && { title: input.title.trim() }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.status !== undefined && {
          status: input.status,
          completedAt: input.status === "DONE" ? new Date() : null,
        }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.dueDate !== undefined && {
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        }),
        ...(input.projectId !== undefined && { projectId: input.projectId }),
        ...(input.order !== undefined && { order: input.order }),
        ...(input.tagIds !== undefined && {
          tags: { set: input.tagIds.map((id) => ({ id })) },
        }),
      },
      include: taskInclude,
    });
  } catch (error) {
    rethrowNotFound(error);
  }
}

export async function deleteTask(
  userId: string,
  taskId: string,
): Promise<{ deleted: boolean }> {
  const result = await prisma.task.deleteMany({
    where: {
      id: taskId,
      userId,
    },
  });

  return {
    deleted: result.count > 0,
  };
}

export async function reorderTask(
  userId: string,
  taskId: string,
  beforeOrder: number | null,
  afterOrder: number | null,
): Promise<TaskWithRelations> {
  const newOrder =
    beforeOrder !== null && afterOrder !== null
      ? (beforeOrder + afterOrder) / 2
      : beforeOrder !== null
        ? beforeOrder + 1
        : afterOrder !== null
          ? afterOrder - 1
          : 0;

  try {
    return await prisma.task.update({
      where: {
        id_userId: {
          id: taskId,
          userId,
        },
      },
      data: { order: newOrder },
      include: taskInclude,
    });
  } catch (error) {
    rethrowNotFound(error);
  }
}

function rethrowNotFound(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    throw new ServiceError(
      "NOT_FOUND",
      "Task không tồn tại hoặc không thuộc về bạn",
    );
  }
  throw error;
}

export class ServiceError extends Error {
  constructor(public code: "VALIDATION" | "NOT_FOUND", message: string) {
    super(message);
    this.name = "ServiceError";
  }
}
