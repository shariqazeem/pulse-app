import { NextRequest, NextResponse } from "next/server";
import { getTipsForSession } from "@/lib/tips";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tips = await getTipsForSession(id, 20);
  return NextResponse.json({ tips });
}
