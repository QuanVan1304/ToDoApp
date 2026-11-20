import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import {
  createTask,
  listTasks,
} from "@/server/services/taskService";
import {
  createTaskSchema,
  listTasksQuerySchema,
} from "@/server/validators/task.schema";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const statusesParam = searchParams.get("statuses");

    const query = listTasksQuerySchema.parse({
      status: searchParams.get("status") ?? undefined,

      statuses: statusesParam
        ? statusesParam.split(",")
        : undefined,

      projectId: searchParams.get("projectId") ?? undefined,
      search: searchParams.get("search") ?? undefined,

      todayOnly:
        searchParams.get("todayOnly") === "true",
    });

    const tasks = await listTasks(session.user.id, query);

    return NextResponse.json(tasks);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    const body = createTaskSchema.parse(
      await request.json(),
    );

    const task = await createTask(session.user.id, {
      ...body,
      source: "MANUAL",
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}