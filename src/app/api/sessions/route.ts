import { NextRequest, NextResponse } from "next/server";
import { createSession, getSessionsByHost } from "@/lib/sessions";
import { getUser } from "@/lib/users";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { hostUsername, title, description } = body as {
    hostUsername?: string;
    title?: string;
    description?: string;
  };

  if (!hostUsername || !title) {
    return NextResponse.json(
      { error: "hostUsername and title required" },
      { status: 400 }
    );
  }

  const host = await getUser(hostUsername);
  if (!host) {
    return NextResponse.json({ error: "Host not found" }, { status: 404 });
  }

  const session = await createSession(hostUsername, title, description);
  return NextResponse.json(session, { status: 201 });
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("hostUsername");
  if (!username) {
    return NextResponse.json({ error: "hostUsername required" }, { status: 400 });
  }
  const sessions = await getSessionsByHost(username);
  return NextResponse.json({ sessions });
}
