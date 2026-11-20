import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireSession();
    const tags = await prisma.tag.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tags);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Tên tag không được để trống" }, { status: 400 });
    }
    const tag = await prisma.tag.create({
      data: { name: name.trim(), userId: session.user.id },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
