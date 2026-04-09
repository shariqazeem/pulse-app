import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/users";
import { getHostWallet } from "@/lib/host-wallet";
import { TOKENS } from "@/lib/tokens";
import { getTokenByAddress } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const user = await getUser(username);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const origin = req.nextUrl.origin;
    const { wallet } = await getHostWallet(user, origin);

    type LendingWallet = {
      lending(): {
        getMarkets(): Promise<unknown[]>;
      };
    };
    const w = wallet as unknown as LendingWallet;
    const rawMarkets = await w.lending().getMarkets();

    const markets = rawMarkets
      .map((m: unknown) => {
        const market = m as Record<string, unknown>;
        const token = market.token as Record<string, unknown> | undefined;
        const symbol =
          (token?.symbol as string) ??
          getTokenByAddress(String(token?.address ?? ""))?.symbol ??
          "???";
        return {
          tokenSymbol: symbol,
          tokenAddress: String(token?.address ?? ""),
          tokenDecimals: Number(token?.decimals ?? 18),
          apy: market.supplyApy != null
            ? Number(market.supplyApy) * 100
            : null,
          poolAddress: market.poolAddress
            ? String(market.poolAddress)
            : null,
          protocol: "Vesu",
        };
      })
      .filter((v) => Object.values(TOKENS).some((t) => t.symbol === v.tokenSymbol));

    return NextResponse.json({ markets });
  } catch (error) {
    console.error("Vesu markets fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets", markets: [] },
      { status: 500 }
    );
  }
}
