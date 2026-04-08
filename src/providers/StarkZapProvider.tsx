"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";

type WalletLike = Record<string, unknown>;

interface StarkZapContextValue {
  wallet: WalletLike | null;
  address: string | null;
  username: string | null;
  isConnecting: boolean;
  isReconnecting: boolean;
  connectWithPrivy: (username: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const StarkZapContext = createContext<StarkZapContextValue | null>(null);

const SESSION_KEY = "pulse-session";

function saveSession(username: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, username);
  }
}

function loadSession(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function StarkZapProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletLike | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(true);

  const connectWithPrivy = useCallback(async (forUsername: string) => {
    setIsConnecting(true);
    try {
      const { StarkZap, OnboardStrategy, accountPresets } = await import(
        "starkzap"
      );
      const { NETWORK, RPC_URL, PAYMASTER_URL } = await import(
        "@/lib/constants"
      );
      const PAYMASTER_API_KEY = process.env.NEXT_PUBLIC_PAYMASTER_API_KEY;

      // Get/create wallet for this user
      const walletRes = await fetch("/api/wallet/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: forUsername }),
      });
      if (!walletRes.ok) {
        throw new Error("Failed to create wallet");
      }
      const walletData = await walletRes.json();

      const sdk = new StarkZap({
        network: NETWORK,
        rpcUrl: RPC_URL,
        paymaster: PAYMASTER_API_KEY
          ? {
              nodeUrl: PAYMASTER_URL,
              default: true,
              headers: { "x-paymaster-api-key": PAYMASTER_API_KEY },
            }
          : undefined,
      });

      const sdkTyped = sdk as unknown as {
        onboard(opts: unknown): Promise<{
          wallet: WalletLike & { address: string };
        }>;
      };

      const origin = window.location.origin;

      const result = await sdkTyped.onboard({
        strategy: OnboardStrategy.Privy,
        accountPreset: accountPresets.argentXV050,
        privy: {
          resolve: async () => ({
            walletId: walletData.walletId,
            publicKey: walletData.publicKey,
            serverUrl: `${origin}/api/wallet/sign`,
          }),
        },
        deploy: "if_needed",
        feeMode: "sponsored",
      });

      setWallet(result.wallet);
      setAddress(result.wallet.address);
      setUsername(forUsername);
      saveSession(forUsername);
    } catch (err) {
      console.error("Privy connect failed:", err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setWallet(null);
    setAddress(null);
    setUsername(null);
    clearSession();
  }, []);

  // Auto-reconnect on mount
  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      connectWithPrivy(stored)
        .catch(() => clearSession())
        .finally(() => setIsReconnecting(false));
    } else {
      setIsReconnecting(false);
    }
  }, [connectWithPrivy]);

  return (
    <StarkZapContext.Provider
      value={{
        wallet,
        address,
        username,
        isConnecting,
        isReconnecting,
        connectWithPrivy,
        disconnect,
      }}
    >
      {children}
    </StarkZapContext.Provider>
  );
}

export function useStarkZapContext() {
  const ctx = useContext(StarkZapContext);
  if (!ctx) {
    throw new Error("useStarkZapContext must be used within StarkZapProvider");
  }
  return ctx;
}
