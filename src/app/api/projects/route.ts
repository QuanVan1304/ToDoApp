import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { createProject, listProjects } from "@/server/services/projectService";

export async function GET() {
  try {
    const session = await requireSession();
    const projects = await listProjects(session.user.id);
    return NextResponse.json(projects);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const project = await createProject(session.user.id, body);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
