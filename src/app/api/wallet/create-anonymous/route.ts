import { NextRequest, NextResponse } from "next/server";
import { getPrivyClient } from "@/lib/privy";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { payerId } = body;

  if (!payerId) {
    return NextResponse.json({ error: "payerId required" }, { status: 400 });
  }

  try {
    const privy = getPrivyClient();
    const wallet = await privy.wallets().create({
      chain_type: "starknet",
    });

    return NextResponse.json({
      walletId: wallet.id,
      address: wallet.address,
      publicKey: wallet.public_key,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create anonymous wallet:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create wallet" },
      { status: 500 }
    );
  }
}
