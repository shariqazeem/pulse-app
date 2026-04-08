import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/users";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const user = await getUser(username);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    username: username.toLowerCase(),
    address: user.address,
  });
}
