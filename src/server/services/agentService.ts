import ollama, { type Message, type Tool } from "ollama";
import * as taskService from "@/server/services/taskService";
import { listProjects } from "@/server/services/projectService";
import {
  cancelTaskDeletion,
  confirmTaskDeletion,
  requestTaskDeletion,
} from "@/server/services/agentActionService";

const model = process.env.OLLAMA_MODEL ?? "qwen3:14b";

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
- Khi user yêu cầu xóa task: gọi list_tasks để tìm task ID, sau đó gọi request_delete_task.
- Không xóa task trực tiếp.
- Trả lời ngắn gọn, rõ ràng bằng tiếng Việt.
- Khi user muốn đổi trạng thái hoặc xóa task, luôn gọi find_task_candidates trước.
- Nếu chỉ có một kết quả phù hợp, dùng id từ kết quả đó.
- Nếu có nhiều kết quả, hỏi user chọn số.
- Tuyệt đối không tự tạo hoặc đoán taskId.
`.trim();

const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "list_tasks",
      description:
        "Lấy danh sách task của user. Dùng trước khi tìm, cập nhật hoặc xóa task.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["TODO", "INPROGRESS", "DONE"],
          },
          search: {
            type: "string",
            description: "Từ khóa tìm trong tiêu đề hoặc ghi chú.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "Lấy danh sách project của user.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Tạo task mới với trạng thái TODO.",
      parameters: {
        type: "object",
        required: ["title"],
        properties: {
          title: {
            type: "string",
            description: "Tên task ngắn gọn bằng tiếng Việt.",
          },
          priority: {
            type: "string",
            enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
          },
          projectId: {
            type: "string",
            description: "ID project nếu user chỉ rõ.",
          },
          dueDate: {
            type: "string",
            description: "Deadline YYYY-MM-DD nếu user chỉ rõ.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description:
        "Cập nhật trạng thái task đã tồn tại. Phải dùng taskId lấy từ list_tasks.",
      parameters: {
        type: "object",
        required: ["taskId", "status"],
        properties: {
          taskId: { type: "string" },
          status: {
            type: "string",
            enum: ["TODO", "INPROGRESS", "DONE"],
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_delete_task",
      description:
        "Tạo yêu cầu xóa task và chờ user xác nhận trong chat. Không xóa trực tiếp.",
      parameters: {
        type: "object",
        required: ["taskId"],
        properties: {
          taskId: {
            type: "string",
            description: "ID task lấy từ list_tasks.",
          },
        },
      },
    },
  },
  {
  type: "function",
    function: {
      name: "find_task_candidates",
      description:
        "Tìm task theo tên hoặc từ khóa gần đúng. Dùng trước khi cập nhật trạng thái hoặc xóa task.",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: {
            type: "string",
            description:
              "Tên task hoặc từ khóa từ user; có thể thiếu dấu hoặc sai chính tả nhẹ.",
          },
        },
      },
    },
  },
];

type ToolArgs = Record<string, unknown>;

async function executeTool(
  userId: string,
  name: string,
  input: ToolArgs,
) {
  switch (name) {
    case "list_tasks": {
      const tasks = await taskService.listTasks(userId, {
        status: input.status as
          | "TODO"
          | "INPROGRESS"
          | "DONE"
          | undefined,
        search: input.search as string | undefined,
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
            "Không tìm thấy công việc này. Hãy dùng list_tasks để lấy đúng taskId trước khi cập nhật.",
        };
      }
      const task = await taskService.updateTask(
        userId,
        String(input.taskId),
        {
          status: input.status as "TODO" | "INPROGRESS" | "DONE",
        },
      );

      return {
        id: task.id,
        title: task.title,
        status: task.status,
      };
    }

    case "request_delete_task": {
      return requestTaskDeletion(
        userId,
        String(input.taskId),
      );
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

export async function runAgentTurn(
  userId: string,
  rawMessage: string,
) {
  const message = rawMessage.trim();
  const normalizedMessage = message.toLowerCase();

  // Xác nhận/hủy được xử lý trực tiếp ở backend.
  // Không cần Qwen suy luận, nhanh và an toàn hơn.
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

  const messages: Message[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: message,
    },
  ];

  // Tối đa ba vòng: model → tool → model.
  for (let step = 0; step < 3; step++) {
    const response = await ollama.chat({
      model,
      messages,
      tools,
      stream: false,
      think: false,
      keep_alive: "30m",
      options: {
        temperature: 0.2,
        num_predict: 80,
        num_ctx: 4096,
      },
    });

    messages.push(response.message);

    const toolCalls = response.message.tool_calls ?? [];

    if (toolCalls.length === 0) {
      return {
        message:
          response.message.content ||
          "Tôi chưa thể tạo phản hồi.",
      };
    }

    for (const call of toolCalls) {
      const result = await executeTool(
        userId,
        call.function.name,
        call.function.arguments as ToolArgs,
      );

      // Với các action ghi dữ liệu: trả ngay, không cần Qwen chạy thêm
      // chỉ để tạo một câu xác nhận.
      if (call.function.name === "create_task") {
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

      if (call.function.name === "update_task_status") {
        const task = result as {
          id: string;
          title: string;
          status: string;
        };

        return {
          message: `Đã cập nhật công việc: ${task.title}.`,
          mutation: {
            type: "update_task_status",
            task,
          },
        };
      }

      if (call.function.name === "request_delete_task") {
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

      // Tool đọc dữ liệu: gửi output trở lại Qwen để nó trả lời tự nhiên.
      messages.push({
        role: "tool",
        tool_name: call.function.name,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    message: "AI cần quá nhiều bước để xử lý yêu cầu này.",
  };
}