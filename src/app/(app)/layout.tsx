import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listProjects } from "@/server/services/projectService";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/login");
  }

  const projects = await listProjects(userId);
  const user = {
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  };

  return (
    <AppShell projects={projects} user={user}>
      {children}
    </AppShell>
  );
}
