import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/tips";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const leaderboard = await getLeaderboard(id);
  return NextResponse.json({ leaderboard });
}
