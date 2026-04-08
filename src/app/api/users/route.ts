import { NextRequest, NextResponse } from "next/server";
import { readUsers, writeUsers } from "@/lib/users";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, address, password } = body;

  if (!username || !address) {
    return NextResponse.json(
      { error: "Username and address are required" },
      { status: 400 }
    );
  }

  if (!password || password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters" },
      { status: 400 }
    );
  }

  const name = username.trim().toLowerCase();

  if (!/^[a-z0-9_-]{3,20}$/.test(name)) {
    return NextResponse.json(
      { error: "Invalid username format" },
      { status: 400 }
    );
  }

  const users = await readUsers();

  if (users[name]) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }

  const { hash, salt } = hashPassword(password);

  users[name] = {
    address,
    createdAt: new Date().toISOString(),
    autoYield: false,
    preferredToken: "USDC",
    products: [],
    passwordHash: hash,
    passwordSalt: salt,
  };

  await writeUsers(users);

  return NextResponse.json({ username: name, address }, { status: 201 });
}
