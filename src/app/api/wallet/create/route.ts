import { NextRequest, NextResponse } from "next/server";
import { getPrivyClient } from "@/lib/privy";
import { readUsers, writeUsers } from "@/lib/users";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const username = body.username as string | undefined;

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const name = username.trim().toLowerCase();
  const users = await readUsers();
  const user = users[name];

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If user already has a Privy wallet, return it
  if (user.privyWalletId && user.privyAddress) {
    return NextResponse.json({
      walletId: user.privyWalletId,
      address: user.privyAddress,
      publicKey: user.privyPublicKey,
    });
  }

  try {
    const privy = getPrivyClient();
    const wallet = await privy.wallets().create({
      chain_type: "starknet",
    });

    // Store wallet info in user record
    user.privyWalletId = wallet.id;
    user.privyAddress = wallet.address;
    user.privyPublicKey = wallet.public_key;

    // Use Privy address as the primary payment address
    user.address = wallet.address;

    users[name] = user;
    await writeUsers(users);

    return NextResponse.json({
      walletId: wallet.id,
      address: wallet.address,
      publicKey: wallet.public_key,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create Privy wallet:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create wallet" },
      { status: 500 }
    );
  }
}
