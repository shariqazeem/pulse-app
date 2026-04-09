import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/users";
import { getHostWallet } from "@/lib/host-wallet";
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
        getPositions(): Promise<unknown[]>;
      };
    };
    const w = wallet as unknown as LendingWallet;
    const rawPositions = await w.lending().getPositions();

    const positions = rawPositions
      .map((p: unknown) => {
        const pos = p as Record<string, unknown>;
        const token = pos.token as Record<string, unknown> | undefined;
        const tokenAddress = String(token?.address ?? "");
        const tokenInfo = getTokenByAddress(tokenAddress);
        const symbol =
          (token?.symbol as string) ?? tokenInfo?.symbol ?? "???";

        // Try various property names for the deposited amount
        const deposited =
          (pos.depositedBase as { toFormatted(): string } | undefined)
            ?.toFormatted() ??
          (pos.deposited as { toFormatted(): string } | undefined)
            ?.toFormatted() ??
          "0";

        return {
          tokenSymbol: symbol,
          tokenAddress,
          deposited,
          poolAddress: pos.poolAddress ? String(pos.poolAddress) : null,
        };
      })
      .filter((p) => parseFloat(p.deposited) > 0);

    return NextResponse.json({ positions });
  } catch (error) {
    console.error("Vesu positions fetch failed:", error);
    return NextResponse.json(
      { positions: [], error: "Failed to fetch positions" },
      { status: 200 } // return 200 with empty so UI doesn't break
    );
  }
}
