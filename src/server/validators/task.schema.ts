import { z } from "zod";

export const statusSchema = z.enum(["TODO", "INPROGRESS", "DONE"]);
export const prioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title không được để trống").max(200),
  notes: z.string().max(5000).optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  dueDate: z.string().date().optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  tagIds: z.array(z.string().min(1)).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  notes: z.string().max(5000).optional().nullable(),
  order: z.number().optional(),
});

export const listTasksQuerySchema = z
  .object({
    status: statusSchema.optional(),
    statuses: z.array(statusSchema).min(1).optional(),
    projectId: z.string().cuid().optional(),
    search: z.string().max(200).optional(),
    todayOnly: z.boolean().optional(),
  })
  .refine(
    (query) => !(query.status && query.statuses),
    {
      message: "Chỉ dùng status hoặc statuses, không dùng cả hai.",
    },
  );

export type CreateTaskDTO = z.infer<typeof createTaskSchema>;
export type UpdateTaskDTO = z.infer<typeof updateTaskSchema>;
