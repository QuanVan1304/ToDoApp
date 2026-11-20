import { prisma } from "@/lib/prisma";
import { deleteTask, getTask } from "./taskService";

const DELETE_EXPIRY_MS = 5 * 60 * 1000;

type PendingDeletePayload = {
  taskId: string;
  title: string;
};

export async function requestTaskDeletion(
  userId: string,
  taskId: string,
) {
  const task = await getTask(userId, taskId);

  if (!task) {
    throw new Error("Không tìm thấy công việc cần xóa.");
  }

  const expiresAt = new Date(Date.now() + DELETE_EXPIRY_MS);

  await prisma.pendingAgentAction.upsert({
    where: {
      userId_type: {
        userId,
        type: "DELETE_TASK",
      },
    },
    create: {
      userId,
      type: "DELETE_TASK",
      payload: {
        taskId: task.id,
        title: task.title,
      },
      expiresAt,
    },
    update: {
      payload: {
        taskId: task.id,
        title: task.title,
      },
      expiresAt,
    },
  });

  return {
    id: task.id,
    title: task.title,
  };
}

export async function confirmTaskDeletion(userId: string) {
  const pending = await prisma.pendingAgentAction.findUnique({
    where: {
      userId_type: {
        userId,
        type: "DELETE_TASK",
      },
    },
  });

  if (!pending) {
    return null;
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    await prisma.pendingAgentAction.delete({
      where: { id: pending.id },
    });

    return {
      expired: true,
      title: null,
    };
  }

  const payload = pending.payload as unknown as PendingDeletePayload;

  // Hàm này kiểm tra ownership theo userId lần nữa.
  await deleteTask(userId, payload.taskId);

  await prisma.pendingAgentAction.delete({
    where: { id: pending.id },
  });

  return {
    expired: false,
    title: payload.title,
  };
}

export async function cancelTaskDeletion(userId: string) {
  await prisma.pendingAgentAction.deleteMany({
    where: {
      userId,
      type: "DELETE_TASK",
    },
  });
}