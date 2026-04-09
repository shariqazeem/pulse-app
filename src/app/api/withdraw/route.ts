import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/users";
import { TOKENS } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { username, password, to, amount, token: tokenSymbol } = body as {
    username?: string;
    password?: string;
    to?: string;
    amount?: string;
    token?: string;
  };

  if (!username || !password || !to || !amount || !tokenSymbol) {
    return NextResponse.json(
      { error: "username, password, to, amount, token required" },
      { status: 400 }
    );
  }

  // Verify password
  const { verifyPassword } = await import("@/lib/auth");
  const user = await getUser(username);
  if (!user || !user.passwordHash || !user.passwordSalt) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (!user.privyWalletId || !user.privyPublicKey) {
    return NextResponse.json({ error: "Wallet not ready" }, { status: 400 });
  }

  const tokenInfo = TOKENS[tokenSymbol.toUpperCase()];
  if (!tokenInfo) {
    return NextResponse.json({ error: `Unknown token: ${tokenSymbol}` }, { status: 400 });
  }

  try {
    const { StarkZap, OnboardStrategy, accountPresets, Amount, fromAddress } = await import("starkzap");
    const { RPC_URL, PAYMASTER_URL } = await import("@/lib/constants");
    const PAYMASTER_API_KEY = process.env.NEXT_PUBLIC_PAYMASTER_API_KEY;

    const origin = req.nextUrl.origin;

    const sdk = new StarkZap({
      network: "mainnet",
      rpcUrl: RPC_URL,
      paymaster: PAYMASTER_API_KEY
        ? { nodeUrl: PAYMASTER_URL, default: true, headers: { "x-paymaster-api-key": PAYMASTER_API_KEY } }
        : undefined,
    });

    const { wallet } = await sdk.onboard({
      strategy: OnboardStrategy.Privy,
      accountPreset: accountPresets.argentXV050,
      privy: {
        resolve: async () => ({
          walletId: user.privyWalletId!,
          publicKey: user.privyPublicKey!,
          serverUrl: `${origin}/api/wallet/sign`,
        }),
      },
      deploy: "if_needed",
      feeMode: "sponsored",
    });

    // Resolve "to" — could be username or address
    let recipientAddress = to;
    if (!to.startsWith("0x")) {
      const recipient = await getUser(to);
      if (!recipient) {
        return NextResponse.json({ error: `User not found: ${to}` }, { status: 404 });
      }
      recipientAddress = recipient.address;
    }

    const token = {
      address: fromAddress(tokenInfo.address),
      decimals: tokenInfo.decimals,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
    };

    const tx = await wallet.tx()
      .transfer(token, {
        to: fromAddress(recipientAddress),
        amount: Amount.parse(amount, token),
      })
      .send();

    await tx.wait();

    return NextResponse.json({
      status: "confirmed",
      hash: tx.hash,
      explorerUrl: tx.explorerUrl,
    });
  } catch (error) {
    console.error("Withdraw failed:", error);
    const raw = error instanceof Error ? error.message : "";
    let clean = "Withdrawal failed";
    if (raw.includes("u256_sub Overflow") || raw.includes("u256sub Overflow")) {
      clean = `Insufficient ${tokenSymbol.toUpperCase()} balance`;
    }
    return NextResponse.json({ error: clean }, { status: 500 });
  }
}
