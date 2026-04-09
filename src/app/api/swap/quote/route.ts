import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/users";
import { getHostWallet } from "@/lib/host-wallet";
import { TOKENS } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { username, tokenInSymbol, tokenOutSymbol, amountIn } = body as {
    username?: string;
    tokenInSymbol?: string;
    tokenOutSymbol?: string;
    amountIn?: string;
  };

  if (!username || !tokenInSymbol || !tokenOutSymbol || !amountIn) {
    return NextResponse.json(
      { error: "username, tokenInSymbol, tokenOutSymbol, amountIn required" },
      { status: 400 }
    );
  }

  const user = await getUser(username);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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
      getQuote(req: unknown): Promise<Record<string, unknown>>;
    };
    const w = wallet as unknown as SwapWallet;

    const raw = await w.getQuote({
      tokenIn,
      tokenOut,
      amountIn: parsedAmountIn,
    });

    const amountOut = raw.amountOutBase as
      | { toFormatted(): string }
      | undefined;

    return NextResponse.json({
      amountIn,
      amountOut: amountOut?.toFormatted() ?? "0",
      priceImpactBps: raw.priceImpactBps ? Number(raw.priceImpactBps) : null,
      provider: raw.provider as string | undefined,
    });
  } catch (error) {
    console.error("Swap quote failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message.slice(0, 200) : "Quote failed" },
      { status: 500 }
    );
  }
}
