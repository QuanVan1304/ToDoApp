import { prisma } from "@/lib/prisma";

export async function listProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { tasks: true } } },
  });
}

export async function createProject(
  userId: string,
  input: { name: string; color?: string }
) {
  if (!input.name?.trim()) {
    throw new Error("Tên project không được để trống");
  }
  return prisma.project.create({
    data: { name: input.name.trim(), color: input.color, userId },
  });
}

export async function deleteProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) {
    throw new Error("Project không tồn tại hoặc không thuộc về bạn");
  }
  // Task thuộc project này sẽ tự set projectId = null (onDelete: SetNull
  // đã khai báo trong schema), không cần xoá thủ công.
  await prisma.project.delete({ where: { id: projectId } });
}
