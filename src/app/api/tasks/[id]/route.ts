import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import {
  deleteTask,
  updateTask,
} from "@/server/services/taskService";
import { updateTaskSchema } from "@/server/validators/task.schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const input = updateTaskSchema.parse(
      await request.json(),
    );

    const task = await updateTask(
      session.user.id,
      id,
      input,
    );

    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext,
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const result = await deleteTask(session.user.id, id);

    return NextResponse.json({
      success: true,
      alreadyDeleted: !result.deleted,
    });
  } catch (error) {
    return handleApiError(error);
  }
}