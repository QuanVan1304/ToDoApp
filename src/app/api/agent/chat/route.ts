import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { runAgentTurn } from "@/server/services/agentService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();

    if (
      typeof body.message !== "string" ||
      !body.message.trim()
    ) {
      return NextResponse.json(
        { error: "Tin nhắn không hợp lệ." },
        { status: 400 },
      );
    }

    const result = await runAgentTurn(
      session.user.id,
      body.message,
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}