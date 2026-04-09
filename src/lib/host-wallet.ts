import type { UserRecord } from "./users";

// Helper to get a connected Starkzap wallet for a host (server-side via Privy)
export async function getHostWallet(user: UserRecord, origin: string) {
  if (!user.privyWalletId || !user.privyPublicKey) {
    throw new Error("Wallet not configured for this user");
  }

  const { StarkZap, OnboardStrategy, accountPresets } = await import("starkzap");
  const { RPC_URL, PAYMASTER_URL } = await import("./constants");
  const PAYMASTER_API_KEY = process.env.NEXT_PUBLIC_PAYMASTER_API_KEY;

  const sdk = new StarkZap({
    network: "mainnet",
    rpcUrl: RPC_URL,
    paymaster: PAYMASTER_API_KEY
      ? {
          nodeUrl: PAYMASTER_URL,
          default: true,
          headers: { "x-paymaster-api-key": PAYMASTER_API_KEY },
        }
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

  return { sdk, wallet };
}

export function cleanError(raw: string, tokenSymbol?: string): string {
  if (raw.includes("u256_sub Overflow") || raw.includes("u256sub Overflow")) {
    return `Insufficient ${tokenSymbol ?? "token"} balance`;
  }
  if (raw.includes("ENTRYPOINT_NOT_FOUND")) {
    return "Wallet not deployed yet";
  }
  if (raw.includes("nonce")) {
    return "Transaction conflict — retry in a moment";
  }
  if (raw.includes("paymaster")) {
    return "Paymaster temporarily unavailable";
  }
  return raw.slice(0, 200);
}
