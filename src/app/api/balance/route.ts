import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/users";

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
    const { StarkZap, fromAddress, Erc20 } = await import("starkzap");
    const { RPC_URL } = await import("@/lib/constants");
    const { TOKENS } = await import("@/lib/tokens");

    const sdk = new StarkZap({ network: "mainnet", rpcUrl: RPC_URL });
    const provider = sdk.getProvider();
    const balances: Record<string, string> = {};

    for (const [sym, info] of Object.entries(TOKENS)) {
      try {
        const token = {
          address: fromAddress(info.address),
          decimals: info.decimals,
          symbol: info.symbol,
          name: info.name,
        };
        const erc20 = new Erc20(token, provider);
        const bal = await erc20.balanceOf(fromAddress(user.address));
        const unit = bal.toUnit();
        if (parseFloat(unit) > 0) {
          balances[sym] = unit;
        }
      } catch {}
    }

    return NextResponse.json({
      username,
      address: user.address,
      balances,
    });
  } catch (error) {
    console.error("Balance fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
