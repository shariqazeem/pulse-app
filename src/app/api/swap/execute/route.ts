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

  const { username, password, tokenInSymbol, tokenOutSymbol, amountIn } =
    body as {
      username?: string;
      password?: string;
      tokenInSymbol?: string;
      tokenOutSymbol?: string;
      amountIn?: string;
    };

  if (!username || !password || !tokenInSymbol || !tokenOutSymbol || !amountIn) {
    return NextResponse.json(
      { error: "username, password, tokenInSymbol, tokenOutSymbol, amountIn required" },
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

  const inInfo = TOKENS[tokenInSymbol.toUpperCase()];
  const outInfo = TOKENS[tokenOutSymbol.toUpperCase()];
  if (!inInfo || !outInfo) {
    return NextResponse.json({ error: "Unknown token" }, { status: 400 });
  }

  try {
    const origin = req.nextUrl.origin;
    const { wallet } = await getHostWallet(user, origin);

    const { Amount, fromAddress } = await import("starkzap");
    const tokenIn = {
      address: fromAddress(inInfo.address),
      decimals: inInfo.decimals,
      symbol: inInfo.symbol,
      name: inInfo.name,
    };
    const tokenOut = {
      address: fromAddress(outInfo.address),
      decimals: outInfo.decimals,
      symbol: outInfo.symbol,
      name: outInfo.name,
    };
    const parsedAmountIn = Amount.parse(amountIn, tokenIn);

    type SwapWallet = {
      swap(req: unknown): Promise<{
        wait(): Promise<void>;
        hash: string;
        explorerUrl?: string;
      }>;
    };
    const w = wallet as unknown as SwapWallet;

    const tx = await w.swap({
      tokenIn,
      tokenOut,
      amountIn: parsedAmountIn,
    });
    await tx.wait();

    return NextResponse.json({
      status: "confirmed",
      hash: tx.hash,
      explorerUrl: tx.explorerUrl,
    });
  } catch (error) {
    console.error("Swap execute failed:", error);
    const raw = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: cleanError(raw, tokenInSymbol.toUpperCase()) },
      { status: 500 }
    );
  }
}
