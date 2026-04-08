import { NextRequest, NextResponse } from "next/server";
import { getSession, endSession } from "@/lib/sessions";
import { getUser } from "@/lib/users";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Include host info for display
  const host = await getUser(session.hostUsername);
  return NextResponse.json({
    ...session,
    host: host
      ? { username: session.hostUsername, address: host.address }
      : null,
  });
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await endSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}
