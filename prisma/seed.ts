// prisma/seed.ts
import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@notebook.app" },
    update: {},
    create: { email: "demo@notebook.app", name: "Demo User" },
  });

  const project = await prisma.project.create({
    data: { name: "App Todo", color: "#8A9BB5", userId: user.id },
  });

  await prisma.task.createMany({
    data: [
      {
        title: "Gửi bản nháp UI cho team review",
        priority: "URGENT",
        userId: user.id,
        projectId: project.id,
        order: 1,
      },
      {
        title: "Viết schema Prisma cho task & project",
        priority: "NORMAL",
        userId: user.id,
        projectId: project.id,
        order: 2,
      },
      {
        title: "Đọc lại roadmap 5 giai đoạn",
        priority: "LOW",
        status: "DONE",
        userId: user.id,
        projectId: project.id,
        order: 3,
      },
    ],
  });

  console.log("Seed xong cho user:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
