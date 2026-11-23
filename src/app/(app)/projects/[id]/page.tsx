import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TaskList } from "@/components/task/TaskList";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect("/login");
  }

  const project = await prisma.project.findFirst({
    where: { id, userId },
    select: { id: true, name: true, color: true },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="w-full px-6 py-10 sm:px-10 lg:px-14">
      <div className="mb-6 flex items-center gap-3">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: project.color || "var(--mustard)" }}
        />
        <h1 className="font-serif text-3xl text-[var(--ink)]">
          {project.name}
        </h1>
      </div>

      <TaskList
        projectId={project.id}
        projectColor={project.color}
        showCreatedDate
      />
    </div>
  );
}