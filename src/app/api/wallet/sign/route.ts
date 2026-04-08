import { NextRequest, NextResponse } from "next/server";
import { getPrivyClient } from "@/lib/privy";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletId, hash } = body;

  if (!walletId || !hash) {
    return NextResponse.json(
      { error: "walletId and hash required" },
      { status: 400 }
    );
  }

  try {
    const privy = getPrivyClient();
    const result = await privy.wallets().rawSign(walletId, {
      params: { hash },
    });

    return NextResponse.json({ signature: result.signature });
  } catch (error) {
    console.error("Signing failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signing failed" },
      { status: 500 }
    );
  }
}
