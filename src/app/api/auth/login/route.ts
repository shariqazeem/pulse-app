import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/users";
import { verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password required" },
      { status: 400 }
    );
  }

  const name = username.trim().toLowerCase();
  const user = await getUser(name);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.passwordHash || !user.passwordSalt) {
    // Legacy user without password — allow login (migration)
    return NextResponse.json({ username: name, address: user.address });
  }

  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  return NextResponse.json({ username: name, address: user.address });
}
