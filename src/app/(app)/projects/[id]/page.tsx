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
    select: { id: true, name: true },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="w-full px-6 py-10 sm:px-10 lg:px-14">
      <h1 className="mb-8 font-serif text-3xl text-[var(--ink)]">
        {project.name}
      </h1>

      <TaskList projectId={project.id} />
    </div>
  );
}