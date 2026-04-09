import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/users";
import { getHostWallet, cleanError } from "@/lib/host-wallet";
import { TOKENS } from "@/lib/tokens";
import { verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { username, password, tokenSymbol, amount, poolAddress } = body as {
    username?: string;
    password?: string;
    tokenSymbol?: string;
    amount?: string;
    poolAddress?: string;
  };

  if (!username || !password || !tokenSymbol || !amount) {
    return NextResponse.json(
      { error: "username, password, tokenSymbol, amount required" },
      { status: 400 }
    );
  }

  const user = await getUser(username);
  if (!user || !user.passwordHash || !user.passwordSalt) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const tokenInfo = TOKENS[tokenSymbol.toUpperCase()];
  if (!tokenInfo) {
    return NextResponse.json(
      { error: `Unknown token: ${tokenSymbol}` },
      { status: 400 }
    );
  }

  try {
    const origin = req.nextUrl.origin;
    const { wallet } = await getHostWallet(user, origin);

    const { Amount, fromAddress } = await import("starkzap");
    const token = {
      address: fromAddress(tokenInfo.address),
      decimals: tokenInfo.decimals,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
    };
    const parsedAmount = Amount.parse(amount, token);

    type LendingWallet = {
      lending(): {
        withdraw(req: unknown): Promise<{ wait(): Promise<void>; hash: string; explorerUrl?: string }>;
      };
    };
    const w = wallet as unknown as LendingWallet;

    const req2: Record<string, unknown> = { token, amount: parsedAmount };
    if (poolAddress) req2.poolAddress = fromAddress(poolAddress);

    const tx = await w.lending().withdraw(req2);
    await tx.wait();

    return NextResponse.json({
      status: "confirmed",
      hash: tx.hash,
      explorerUrl: tx.explorerUrl,
    });
  } catch (error) {
    console.error("Vesu withdraw failed:", error);
    const raw = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: cleanError(raw, tokenSymbol.toUpperCase()) },
      { status: 500 }
    );
  }
}
