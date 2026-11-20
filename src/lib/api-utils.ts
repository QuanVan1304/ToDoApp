import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ServiceError } from "@/server/services/taskService";
import { UnauthorizedError } from "@/lib/session";

/**
 * Bọc handler API route: bắt lỗi từ requireSession(), Zod validate, và
 * các Service — trả về đúng status code, tránh lặp try/catch ở từng route.
 */
export function handleApiError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ", issues: error.flatten() },
      { status: 400 }
    );
  }
  if (error instanceof ServiceError) {
    const status = error.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
