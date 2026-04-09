"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Delete, Zap, Loader2 } from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";

interface SessionInfo {
  id: string;
  hostUsername: string;
  title: string;
  status: "live" | "ended";
  totalRaised: number;
  tipCount: number;
  host?: { username: string; address: string } | null;
}

const TOKENS = ["STRK", "USDC", "ETH"];

export default function TipPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const { playTick, playPop, playChime } = useHaptics();

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("STRK");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [showMessageField, setShowMessageField] = useState(false);
  const [wallet, setWallet] = useState<unknown>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [success, setSuccess] = useState<{ hash: string; explorerUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFundWallet, setShowFundWallet] = useState(false);

  // Fetch session
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSession(data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [sessionId]);

  // Numpad handler
  const onKey = useCallback(
    (key: string) => {
      playTick();
      if (key === "del") {
        setAmount((a) => a.slice(0, -1));
        return;
      }
      if (key === ".") {
        if (!amount.includes(".")) setAmount((a) => a + ".");
        return;
      }
      if (amount.includes(".")) {
        const dec = amount.split(".")[1];
        if (dec && dec.length >= 2) return;
      }
      if (amount.length > 8) return;
      setAmount((a) => (a === "0" ? key : a + key));
    },
    [amount, playTick]
  );

  // Connect Cartridge
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { StarkZap } = await import("starkzap");
      const { NETWORK, RPC_URL, TOKEN_ADDRESSES } = await import("@/lib/constants");

      const sdk = new StarkZap({ network: NETWORK, rpcUrl: RPC_URL });
      const w = await sdk.connectCartridge({
        policies: Object.values(TOKEN_ADDRESSES).map((addr) => ({
          target: addr,
          method: "transfer",
        })),
      });
      setWallet(w);
      setWalletAddress(String((w as { address?: unknown }).address ?? ""));
      playPop();
    } catch (err) {
      console.error("Connect failed:", err);
      setError("Failed to connect. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  }, [playPop]);

  // Send tip
  const sendTip = useCallback(async () => {
    if (!wallet || !session?.host || !amount) return;
    setIsPaying(true);
    setError(null);
    try {
      const { fromAddress, Amount, TxBuilder } = await import("starkzap");
      const { TOKENS: TOKEN_INFO } = await import("@/lib/tokens");

      const tokenMeta = TOKEN_INFO[token];
      if (!tokenMeta) throw new Error("Unknown token");

      const tokenObj = {
        address: fromAddress(tokenMeta.address),
        decimals: tokenMeta.decimals,
        symbol: tokenMeta.symbol,
        name: tokenMeta.name,
      };

      const cleanAmount = amount.replace(/,/g, "").trim();
      const parsedAmount = Amount.parse(cleanAmount, tokenObj);

      // Execute transfer
      const tx = await new TxBuilder(
        wallet as Parameters<typeof TxBuilder extends new (...args: infer A) => unknown ? (...args: A) => void : never>[0]
      )
        .transfer(tokenObj, {
          to: fromAddress(session.host.address),
          amount: parsedAmount,
        })
        .send();

      await tx.wait();

      // Log tip in DB so SSE picks it up
      await fetch(`/api/sessions/${sessionId}/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cleanAmount,
          token,
          displayName: displayName || undefined,
          message: message || undefined,
          txHash: tx.hash,
        }),
      });

      playChime();
      setSuccess({ hash: tx.hash, explorerUrl: tx.explorerUrl });
    } catch (err) {
      console.error("Tip failed:", err);
      const msg = err instanceof Error ? err.message : "Tip failed";
      let clean = "Tip failed. Please try again.";
      if (msg.includes("u256") || msg.includes("Overflow")) {
        clean = `Insufficient ${token} balance.`;
        setShowFundWallet(true);
      } else if (msg.includes("Invalid amount")) {
        clean = "Invalid amount.";
      }
      setError(clean);
    } finally {
      setIsPaying(false);
    }
  }, [wallet, session, amount, token, displayName, message, sessionId, playChime]);

  // Reset for another tip
  const tipAgain = useCallback(() => {
    setSuccess(null);
    setAmount("");
    setMessage("");
    setShowMessageField(false);
  }, []);

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFDFD] px-6">
        <div className="text-center">
          <p className="text-base font-medium text-zinc-900">Session not found</p>
          <p className="mt-1 text-sm text-zinc-500">
            This live session has ended or doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFDFD]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-zinc-200 border-t-zinc-900"
        />
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFDFD] px-6">
        <div className="text-center">
          <p className="text-base font-medium text-zinc-900">Session ended</p>
          <p className="mt-1 text-sm text-zinc-500">
            This session is no longer accepting tips.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFDFD] px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50"
          >
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </motion.div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-zinc-900">
            Sent
          </h1>
          <p className="mt-2 text-base text-zinc-500">
            {amount} {token} → @{session.hostUsername}
          </p>
          {success.explorerUrl && (
            <a
              href={success.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-xs text-zinc-400 underline"
            >
              View on explorer
            </a>
          )}
          <button onClick={tipAgain} className="btn mt-8 w-full">
            Tip again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#FDFDFD] px-6 pb-8 pt-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-sm text-center"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
          Tip
        </p>
        <p className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-zinc-900">
          @{session.hostUsername}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{session.title}</p>
      </motion.div>

      {/* Amount display */}
      <div className="mx-auto mt-6 flex w-full max-w-sm flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={amount}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`text-[64px] font-extralight leading-none tracking-[-0.04em] tabular ${
              amount ? "text-zinc-900" : "text-zinc-200"
            }`}
          >
            {amount || "0"}
          </motion.div>
        </AnimatePresence>

        {/* Token selector */}
        <div className="mt-3 flex gap-1.5">
          {TOKENS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setToken(t);
                playTick();
              }}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                token === t
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Numpad */}
      <div className="mx-auto mt-6 grid w-full max-w-[280px] grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map(
          (key) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.92 }}
              onClick={() => onKey(key)}
              className="flex h-14 items-center justify-center rounded-2xl bg-white text-xl font-medium text-zinc-900 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 active:bg-zinc-100"
            >
              {key === "del" ? <Delete className="h-5 w-5 text-zinc-400" /> : key}
            </motion.button>
          )
        )}
      </div>

      {/* Optional message + display name */}
      {!wallet && (
        <div className="mx-auto mt-4 w-full max-w-[280px] space-y-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name (optional)"
            maxLength={30}
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-zinc-900 ring-1 ring-zinc-200 placeholder:text-zinc-300 focus:outline-none"
          />
          {showMessageField ? (
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message (optional)"
              maxLength={140}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-zinc-900 ring-1 ring-zinc-200 placeholder:text-zinc-300 focus:outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setShowMessageField(true)}
              className="text-[11px] text-zinc-400 hover:text-zinc-600"
            >
              + Add a message
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mx-auto mt-4 max-w-[280px] text-center text-xs text-red-500">
          {error}
        </p>
      )}

      {/* Fund wallet helper */}
      {showFundWallet && walletAddress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-3 w-full max-w-[280px]"
        >
          <div className="rounded-2xl bg-amber-50 p-4 text-center ring-1 ring-amber-100">
            <p className="text-[12px] font-medium text-zinc-900">
              Fund your wallet to tip
            </p>
            <p className="mt-1.5 text-[10px] text-zinc-500">
              Send tokens to this address:
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(walletAddress);
              }}
              className="mt-2 w-full rounded-xl bg-white px-3 py-2 font-mono text-[9px] text-zinc-700 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 active:bg-zinc-100"
            >
              {walletAddress.slice(0, 12)}...{walletAddress.slice(-8)}
              <span className="ml-1 text-zinc-400">tap to copy</span>
            </button>
            <div className="mt-3 flex items-center justify-center gap-2">
              <a
                href="https://app.avnu.fi/en?tokenFrom=0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7&tokenTo=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-[10px] font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Buy STRK on AVNU
              </a>
              <a
                href="https://ramp.network/buy?defaultAsset=STRK_STARKNET"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-zinc-700 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50"
              >
                Buy with card
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <div className="mx-auto mt-auto w-full max-w-[280px] pt-6">
        {!wallet ? (
          <button
            onClick={connect}
            disabled={isConnecting || !amount || parseFloat(amount) <= 0}
            className="btn w-full"
          >
            {isConnecting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Connect &amp; Tip
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={sendTip}
            disabled={isPaying || !amount || parseFloat(amount) <= 0}
            className="btn w-full"
          >
            {isPaying ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending
              </span>
            ) : (
              `Tip ${amount || "0"} ${token}`
            )}
          </button>
        )}
        <p className="mt-3 text-center text-[10px] text-zinc-300">
          Gasless · Powered by Starkzap v2
        </p>
      </div>
    </div>
  );
}
