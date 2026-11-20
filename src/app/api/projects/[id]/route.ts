import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { deleteProject } from "@/server/services/projectService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext,
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    await deleteProject(session.user.id, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
