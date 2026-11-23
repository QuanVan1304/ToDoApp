import * as taskService from "@/server/services/taskService";
import { listProjects } from "@/server/services/projectService";
import {
  cancelTaskDeletion,
  confirmTaskDeletion,
  requestTaskDeletion,
} from "@/server/services/agentActionService";

const CONFIRM_WORDS = new Set([
  "xác nhận",
  "xac nhan",
  "đồng ý",
  "dong y",
  "ok",
  "oke",
  "ok nha",
  "yes",
  "ừ",
  "uh",
  "được",
  "duoc",
  "xóa đi",
  "xoa di",
]);

const CANCEL_WORDS = new Set([
  "hủy",
  "huy",
  "không",
  "khong",
  "cancel",
]);

const SYSTEM_PROMPT = `
Bạn là trợ lý quản lý công việc Notebook, nói tiếng Việt.

Bạn có thể:
- Đọc danh sách task.
- Đọc danh sách project.
- Tạo task.
- Chuyển trạng thái task.
- Yêu cầu xác nhận xóa task.

Quy tắc an toàn:
- Luôn dùng tool khi cần đọc hoặc thay đổi dữ liệu.
- Không được tự nghĩ ra task ID hoặc project ID.
- Task mới mặc định là TODO.
- Chỉ chuyển task sang DONE khi người dùng nói rõ đã hoàn thành.
- Khi user yêu cầu xóa task: gọi find_task_candidates hoặc list_tasks để tìm task ID, sau đó gọi request_delete_task.
- Không xóa task trực tiếp.
- Trả lời ngắn gọn, rõ ràng, tự nhiên bằng tiếng Việt (dùng "chưa làm", "đang làm", "đã hoàn thành" thay vì từ kỹ thuật TODO/INPROGRESS/DONE).
- Khi liệt kê từ 2 công việc hoặc dự án trở lên, LUÔN xuống dòng riêng cho từng mục bằng đánh số (1., 2., 3.) để dễ đọc.
- Khi user hỏi việc cần làm, việc hôm nay, việc còn lại hoặc gợi ý ưu tiên: luôn gọi list_tasks với status = "ACTIVE" (gồm cả việc chưa làm và đang làm, loại bỏ việc đã xong).
- Khi user muốn đổi trạng thái hoặc xóa task, luôn gọi find_task_candidates trước.
- Nếu chỉ có một kết quả phù hợp, dùng id từ kết quả đó.
- Nếu có nhiều kết quả, hỏi user chọn số.
- Tuyệt đối không tự tạo hoặc đoán taskId.
`.trim();

const functionDeclarations = [
  {
    name: "list_tasks",
    description:
      "Lấy danh sách công việc của user. Mặc định dùng status='ACTIVE' để lấy toàn bộ việc cần làm (gồm cả TODO và INPROGRESS, không lấy DONE).",
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          enum: ["ACTIVE", "TODO", "INPROGRESS", "DONE"],
          description:
            "ACTIVE: tất cả việc chưa xong (TODO + INPROGRESS). Chỉ dùng TODO, INPROGRESS hoặc DONE khi user hỏi riêng một trạng thái cụ thể.",
        },
        search: {
          type: "STRING",
          description: "Từ khóa tìm trong tiêu đề hoặc ghi chú.",
        },
      },
    },
  },
  {
    name: "list_projects",
    description: "Lấy danh sách project của user.",
  },
  {
    name: "create_task",
    description: "Tạo task mới với trạng thái TODO.",
    parameters: {
      type: "OBJECT",
      required: ["title"],
      properties: {
        title: {
          type: "STRING",
          description: "Tên task ngắn gọn bằng tiếng Việt.",
        },
        priority: {
          type: "STRING",
          enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
        },
        projectId: {
          type: "STRING",
          description: "ID project nếu user chỉ rõ.",
        },
        dueDate: {
          type: "STRING",
          description: "Deadline YYYY-MM-DD nếu user chỉ rõ.",
        },
      },
    },
  },
  {
    name: "update_task_status",
    description:
      "Cập nhật trạng thái task đã tồn tại. Phải dùng taskId lấy từ list_tasks hoặc find_task_candidates.",
    parameters: {
      type: "OBJECT",
      required: ["taskId", "status"],
      properties: {
        taskId: { type: "STRING" },
        status: {
          type: "STRING",
          enum: ["TODO", "INPROGRESS", "DONE"],
        },
      },
    },
  },
  {
    name: "request_delete_task",
    description:
      "Tạo yêu cầu xóa task và chờ user xác nhận trong chat. Không xóa trực tiếp.",
    parameters: {
      type: "OBJECT",
      required: ["taskId"],
      properties: {
        taskId: {
          type: "STRING",
          description:
            "ID task lấy từ list_tasks hoặc find_task_candidates.",
        },
      },
    },
  },
  {
    name: "find_task_candidates",
    description:
      "Tìm task theo tên hoặc từ khóa gần đúng. Dùng trước khi cập nhật trạng thái hoặc xóa task.",
    parameters: {
      type: "OBJECT",
      required: ["query"],
      properties: {
        query: {
          type: "STRING",
          description:
            "Tên task hoặc từ khóa từ user; có thể thiếu dấu hoặc sai chính tả nhẹ.",
        },
      },
    },
  },
];

type ToolArgs = Record<string, unknown>;

async function executeTool(
  userId: string,
  name: string,
  input: ToolArgs = {},
) {
  switch (name) {
    case "list_tasks": {
      const rawStatus = input.status as
        | "ACTIVE"
        | "TODO"
        | "INPROGRESS"
        | "DONE"
        | undefined;
      const search = input.search as string | undefined;

      const tasks =
        !rawStatus || rawStatus === "ACTIVE"
          ? await taskService.listTasks(userId, {
              statuses: ["TODO", "INPROGRESS"],
              search,
            })
          : await taskService.listTasks(userId, {
              status: rawStatus,
              search,
            });

      return tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        project: task.project?.name ?? null,
      }));
    }

    case "list_projects": {
      const projects = await listProjects(userId);

      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        color: project.color,
        taskCount: project._count.tasks,
      }));
    }

    case "create_task": {
      const task = await taskService.createTask(userId, {
        title: String(input.title),
        priority:
          (input.priority as
            | "LOW"
            | "NORMAL"
            | "HIGH"
            | "URGENT") ?? "NORMAL",
        projectId: (input.projectId as string | undefined) ?? null,
        dueDate: (input.dueDate as string | undefined) ?? null,
        source: "AGENT",
      });

      return {
        id: task.id,
        title: task.title,
        status: task.status,
      };
    }

    case "update_task_status": {
      const taskId = String(input.taskId);

      const existingTask = await taskService.getTask(userId, taskId);

      if (!existingTask) {
        return {
          error:
            "Không tìm thấy công việc này. Hãy dùng find_task_candidates hoặc list_tasks để lấy đúng taskId trước khi cập nhật.",
        };
      }
      const task = await taskService.updateTask(userId, taskId, {
        status: input.status as "TODO" | "INPROGRESS" | "DONE",
      });

      return {
        id: task.id,
        title: task.title,
        status: task.status,
      };
    }

    case "request_delete_task": {
      return requestTaskDeletion(userId, String(input.taskId));
    }

    case "find_task_candidates": {
      return taskService.findTaskCandidates(
        userId,
        String(input.query),
      );
    }

    default:
      throw new Error(`Tool không được hỗ trợ: ${name}`);
  }
}

interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
  [key: string]: unknown;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: GeminiContent;
  }>;
  error?: {
    message?: string;
  };
}

export async function runAgentTurn(
  userId: string,
  rawMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
) {
  const message = rawMessage.trim();
  const normalizedMessage = message.toLowerCase();

  // Xác nhận/hủy được xử lý trực tiếp ở backend.
  if (CONFIRM_WORDS.has(normalizedMessage)) {
    const result = await confirmTaskDeletion(userId);

    if (!result) {
      return {
        message: "Không có yêu cầu xóa nào đang chờ xác nhận.",
      };
    }

    if (result.expired) {
      return {
        message: "Yêu cầu xóa đã hết hạn. Hãy gửi lại yêu cầu xóa task.",
      };
    }

    return {
      message: `Đã xóa công việc: ${result.title}.`,
      mutation: {
        type: "delete_task",
      },
    };
  }

  if (CANCEL_WORDS.has(normalizedMessage)) {
    await cancelTaskDeletion(userId);

    return {
      message: "Đã hủy yêu cầu xóa công việc.",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      message:
        "Chưa có GEMINI_API_KEY trong file .env. Bạn hãy lấy key miễn phí tại https://aistudio.google.com/apikey rồi dán vào GEMINI_API_KEY trong file .env nhé!",
    };
  }

  const primaryModel =
    process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const candidateModels = Array.from(
    new Set([
      primaryModel,
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
    ]),
  );

  let pinnedModel: string | null = null;

  const contents: GeminiContent[] = [
    ...history.map((item) => ({
      role: (item.role === "assistant" ? "model" : "user") as
        | "user"
        | "model",
      parts: [{ text: item.content }],
    })),
    {
      role: "user",
      parts: [{ text: message }],
    },
  ];

  // Tối đa ba vòng: model → tool → model.
  for (let step = 0; step < 3; step++) {
    let data: GeminiResponse | null = null;
    let lastErrorMessage = "";

    const modelsToTry: string[] = pinnedModel
      ? [pinnedModel, ...candidateModels.filter((m) => m !== pinnedModel)]
      : candidateModels;

    for (const model of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8_000),
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
            contents,
            tools: [{ functionDeclarations }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1024,
            },
          }),
        });

        const body = (await res.json()) as GeminiResponse;

        if (res.ok) {
          data = body;
          pinnedModel = model;
          break;
        }

        lastErrorMessage =
          body.error?.message || `Gemini API lỗi (${res.status})`;

        // Nếu lỗi tạm thời (quá tải 503, giới hạn 429, model không khả dụng 404, lỗi 500) -> thử model dự phòng tiếp theo
        if ([404, 429, 500, 503].includes(res.status)) {
          console.warn(
            `[Gemini Fallback] ${model} trả về ${res.status}: ${lastErrorMessage}`,
          );
          continue;
        }

        throw new Error(lastErrorMessage);
      } catch (err) {
        if (err instanceof Error && err.name === "TimeoutError") {
          console.warn(`[Gemini Fallback] ${model} quá thời gian 8s, đổi model.`);
          continue;
        }
        throw err;
      }
    }

    if (!data) {
      return {
        message:
          "Máy chủ Gemini đang hơi quá tải tạm thời, bạn thử gửi lại sau vài giây nhé!",
      };
    }

    const modelContent = data.candidates?.[0]?.content;
    const parts = modelContent?.parts ?? [];

    if (!modelContent || parts.length === 0) {
      return {
        message: "Tôi chưa thể tạo phản hồi.",
      };
    }

    contents.push(modelContent);

    const functionCalls = parts
      .map((p) => p.functionCall)
      .filter(
        (
          fc,
        ): fc is {
          name: string;
          args?: Record<string, unknown>;
        } => Boolean(fc),
      );

    if (functionCalls.length === 0) {
      const textReply = parts
        .filter((p) => !p.thought)
        .map((p) => p.text ?? "")
        .join("")
        .trim();

      return {
        message: textReply || "Tôi chưa thể tạo phản hồi.",
      };
    }

    const responseParts: GeminiPart[] = [];

    for (const call of functionCalls) {
      const result = await executeTool(
        userId,
        call.name,
        call.args ?? {},
      );

      if (call.name === "create_task") {
        const task = result as {
          id: string;
          title: string;
          status: string;
        };

        return {
          message: `Đã thêm công việc: ${task.title}.`,
          mutation: {
            type: "create_task",
            task,
          },
        };
      }

      if (call.name === "update_task_status") {
        const resultObj = result as {
          id?: string;
          title?: string;
          status?: string;
          error?: string;
        };

        if (!resultObj.error && resultObj.id && resultObj.title) {
          return {
            message: `Đã cập nhật công việc: ${resultObj.title}.`,
            mutation: {
              type: "update_task_status",
              task: resultObj,
            },
          };
        }
      }

      if (call.name === "request_delete_task") {
        const task = result as {
          id: string;
          title: string;
        };

        return {
          message:
            `Bạn có chắc muốn xóa công việc “${task.title}” không? ` +
            `Nhắn “xác nhận” để xóa hoặc “hủy” để dừng.`,
        };
      }

      responseParts.push({
        functionResponse: {
          name: call.name,
          response: { result },
        },
      });
    }

    contents.push({
      role: "user",
      parts: responseParts,
    });
  }

  return {
    message: "AI cần quá nhiều bước để xử lý yêu cầu này.",
  };
}
