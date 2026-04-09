"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Send,
  Plus,
  Copy,
  Check,
  LogOut,
  ArrowRight,
  TrendingUp,
  Calendar,
  AlertCircle,
  X,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Sparkles,
} from "lucide-react";
import { useStarkZapContext } from "@/providers/StarkZapProvider";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Logo } from "@/components/Logo";

interface SessionRow {
  id: string;
  hostUsername: string;
  title: string;
  status: "live" | "ended";
  totalRaised: number;
  tipCount: number;
  createdAt: string;
  endedAt?: string;
}

const TOKEN_OPTIONS = ["STRK", "USDC", "ETH"];

export default function DashboardPage() {
  const router = useRouter();
  const { username, address, isReconnecting, disconnect } = useStarkZapContext();

  const [balances, setBalances] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [isLoadingBal, setIsLoadingBal] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showStash, setShowStash] = useState(false);
  const [showSwap, setShowSwap] = useState(false);

  // Withdraw form state
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawToken, setWithdrawToken] = useState("STRK");
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Vesu state
  const [vesuMarkets, setVesuMarkets] = useState<
    { tokenSymbol: string; apy: number | null; poolAddress: string | null }[]
  >([]);
  const [vesuPositions, setVesuPositions] = useState<
    { tokenSymbol: string; deposited: string; poolAddress: string | null }[]
  >([]);
  const [stashToken, setStashToken] = useState("USDC");
  const [stashAmount, setStashAmount] = useState("");
  const [stashAction, setStashAction] = useState<"deposit" | "withdraw">("deposit");
  const [stashPassword, setStashPassword] = useState("");
  const [stashError, setStashError] = useState<string | null>(null);
  const [isStashing, setIsStashing] = useState(false);
  const [stashSuccess, setStashSuccess] = useState<string | null>(null);

  // Swap state
  const [swapFrom, setSwapFrom] = useState("STRK");
  const [swapTo, setSwapTo] = useState("USDC");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapQuote, setSwapQuote] = useState<{ amountOut: string } | null>(null);
  const [swapPassword, setSwapPassword] = useState("");
  const [swapError, setSwapError] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isReconnecting && !username) {
      router.push("/create");
    }
  }, [isReconnecting, username, router]);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!username) return;
    setIsLoadingBal(true);
    try {
      const res = await fetch(`/api/balance?username=${username}`);
      if (res.ok) {
        const data = await res.json();
        setBalances(data.balances ?? {});
      }
    } catch {}
    setIsLoadingBal(false);
  }, [username]);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!username) return;
    try {
      const res = await fetch(`/api/sessions?hostUsername=${username}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } catch {}
  }, [username]);

  // Fetch Vesu markets + positions
  const fetchVesu = useCallback(async () => {
    if (!username) return;
    try {
      const [marketsRes, posRes] = await Promise.all([
        fetch(`/api/vesu/markets?username=${username}`),
        fetch(`/api/vesu/positions?username=${username}`),
      ]);
      if (marketsRes.ok) {
        const data = await marketsRes.json();
        setVesuMarkets(data.markets ?? []);
      }
      if (posRes.ok) {
        const data = await posRes.json();
        setVesuPositions(data.positions ?? []);
      }
    } catch {}
  }, [username]);

  useEffect(() => {
    fetchBalances();
    fetchSessions();
    fetchVesu();
  }, [fetchBalances, fetchSessions, fetchVesu]);

  // Auto-quote on swap input change
  useEffect(() => {
    if (!swapAmount || parseFloat(swapAmount) <= 0 || !username) {
      setSwapQuote(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/swap/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            tokenInSymbol: swapFrom,
            tokenOutSymbol: swapTo,
            amountIn: swapAmount,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSwapQuote({ amountOut: data.amountOut });
        }
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [swapAmount, swapFrom, swapTo, username]);

  // Stash (Vesu deposit/withdraw)
  const handleStash = useCallback(async () => {
    if (!username || !stashAmount || !stashPassword) return;
    setIsStashing(true);
    setStashError(null);
    try {
      const market = vesuMarkets.find((m) => m.tokenSymbol === stashToken);
      const res = await fetch(`/api/vesu/${stashAction}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password: stashPassword,
          tokenSymbol: stashToken,
          amount: stashAmount,
          poolAddress: market?.poolAddress ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setStashSuccess(data.explorerUrl ?? "");
      setStashAmount("");
      setStashPassword("");
      fetchBalances();
      fetchVesu();
      setTimeout(() => {
        setShowStash(false);
        setStashSuccess(null);
      }, 3000);
    } catch (err) {
      setStashError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsStashing(false);
    }
  }, [username, stashAmount, stashPassword, stashToken, stashAction, vesuMarkets, fetchBalances, fetchVesu]);

  // Swap
  const handleSwap = useCallback(async () => {
    if (!username || !swapAmount || !swapPassword) return;
    setIsSwapping(true);
    setSwapError(null);
    try {
      const res = await fetch("/api/swap/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password: swapPassword,
          tokenInSymbol: swapFrom,
          tokenOutSymbol: swapTo,
          amountIn: swapAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSwapSuccess(data.explorerUrl ?? "");
      setSwapAmount("");
      setSwapPassword("");
      setSwapQuote(null);
      fetchBalances();
      setTimeout(() => {
        setShowSwap(false);
        setSwapSuccess(null);
      }, 3000);
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsSwapping(false);
    }
  }, [username, swapAmount, swapPassword, swapFrom, swapTo, fetchBalances]);

  const copyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  const handleWithdraw = useCallback(async () => {
    if (!username || !withdrawTo || !withdrawAmount || !withdrawPassword) return;
    setIsWithdrawing(true);
    setWithdrawError(null);
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password: withdrawPassword,
          to: withdrawTo,
          amount: withdrawAmount,
          token: withdrawToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Withdrawal failed");
      }
      setWithdrawSuccess(data.explorerUrl ?? "");
      setWithdrawTo("");
      setWithdrawAmount("");
      setWithdrawPassword("");
      fetchBalances();
      setTimeout(() => {
        setShowWithdraw(false);
        setWithdrawSuccess(null);
      }, 3000);
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsWithdrawing(false);
    }
  }, [username, withdrawTo, withdrawAmount, withdrawToken, withdrawPassword, fetchBalances]);

  const handleLogout = useCallback(async () => {
    if (!confirm("Sign out?")) return;
    await disconnect();
    router.push("/");
  }, [disconnect, router]);

  if (isReconnecting || !username) {
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

  const totalRaised = sessions.reduce((sum, s) => sum + s.totalRaised, 0);
  const totalTips = sessions.reduce((sum, s) => sum + s.tipCount, 0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FDFDFD]">
      <AmbientBackground />

      <div className="relative mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center">
              <Logo size={40} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                Dashboard
              </p>
              <p className="text-sm font-semibold text-zinc-900">@{username}</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition-colors hover:text-zinc-900"
          >
            <LogOut className="h-4 w-4" />
          </motion.button>
        </motion.div>

        {/* Hero stats */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-elevated mb-6 p-8"
        >
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              Lifetime raised
            </p>
            <h1 className="mt-3 text-[64px] font-extralight leading-none tracking-[-0.045em] text-zinc-900 tabular">
              {totalRaised.toFixed(2)}
            </h1>
            <p className="mt-3 text-sm text-zinc-500">
              from {totalTips} {totalTips === 1 ? "tip" : "tips"} across{" "}
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/create")}
              className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-zinc-900 text-[12px] font-medium text-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowWithdraw(true)}
              className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-white text-[12px] font-medium text-zinc-900 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setStashAction("deposit");
                setShowStash(true);
              }}
              className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-amber-50 text-[12px] font-medium text-amber-900 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Stash
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSwap(true)}
              className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-white text-[12px] font-medium text-zinc-900 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Swap
            </motion.button>
          </div>
        </motion.div>

        {/* Vesu yield card */}
        {(vesuPositions.length > 0 || vesuMarkets.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card mb-6 p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                  Vesu Yield
                </p>
              </div>
              {vesuMarkets.length > 0 && (
                <p className="text-[10px] text-zinc-400">
                  Up to{" "}
                  <span className="font-semibold text-amber-600">
                    {Math.max(...vesuMarkets.map((m) => m.apy ?? 0)).toFixed(1)}% APY
                  </span>
                </p>
              )}
            </div>

            {vesuPositions.length === 0 ? (
              <button
                onClick={() => {
                  setStashAction("deposit");
                  setShowStash(true);
                }}
                className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 text-left transition-all hover:from-amber-100 hover:to-amber-100"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    Earn yield on your tips
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    Deposit any token to start earning passively
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-700" />
              </button>
            ) : (
              <div className="space-y-2">
                {vesuPositions.map((p, i) => (
                  <motion.div
                    key={p.tokenSymbol}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-amber-200">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {p.tokenSymbol}
                        </p>
                        <p className="text-[10px] text-amber-600">
                          Earning yield
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900 tabular">
                        {parseFloat(p.deposited).toFixed(4)}
                      </p>
                      <button
                        onClick={() => {
                          setStashAction("withdraw");
                          setStashToken(p.tokenSymbol);
                          setShowStash(true);
                        }}
                        className="text-[10px] text-amber-600 hover:underline"
                      >
                        Withdraw
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Balances */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card mb-6 p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              Wallet Balance
            </p>
            <button
              onClick={copyAddress}
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Copied" : address?.slice(0, 6) + "..." + address?.slice(-4)}
            </button>
          </div>

          {isLoadingBal ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : Object.keys(balances).length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-400">No tokens yet</p>
              <p className="mt-1 text-xs text-zinc-300">
                Start a session to receive tips
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(balances).map(([sym, bal], i) => (
                <motion.div
                  key={sym}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-zinc-200">
                      <span className="text-[10px] font-bold text-zinc-700">
                        {sym.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{sym}</p>
                      <p className="text-[10px] text-zinc-400">Starknet</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 tabular">
                    {parseFloat(bal).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              Sessions
            </p>
          </div>
          {sessions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-400">No sessions yet</p>
              <button
                onClick={() => router.push("/create")}
                className="mt-3 text-xs text-zinc-900 underline underline-offset-2"
              >
                Start your first session
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, i) => (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.005 }}
                  onClick={() => router.push(`/live/${s.id}`)}
                  className="flex w-full items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-left transition-colors hover:bg-zinc-100"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {s.title}
                      </p>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                          s.status === "live"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        {s.status === "live" && (
                          <span className="h-1 w-1 rounded-full bg-emerald-500" />
                        )}
                        {s.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {s.tipCount} {s.tipCount === 1 ? "tip" : "tips"} ·{" "}
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-3 text-right">
                    <p className="text-sm font-semibold text-zinc-900 tabular">
                      {s.totalRaised.toFixed(2)}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <p className="mt-10 text-center text-[10px] text-zinc-300">
          Built with Starkzap v2 on Starknet
        </p>
      </div>

      {/* Withdraw modal */}
      <AnimatePresence>
        {showWithdraw && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isWithdrawing && setShowWithdraw(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-4"
            >
              <div className="card-elevated p-6">
                {withdrawSuccess !== null ? (
                  <div className="py-4 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"
                    >
                      <Check className="h-8 w-8 text-emerald-500" />
                    </motion.div>
                    <p className="text-lg font-semibold text-zinc-900">Sent</p>
                    {withdrawSuccess && (
                      <a
                        href={withdrawSuccess}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-zinc-400 underline"
                      >
                        View on explorer
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-zinc-900">
                        Send funds
                      </h2>
                      <button
                        onClick={() => !isWithdrawing && setShowWithdraw(false)}
                        className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                          To
                        </label>
                        <input
                          type="text"
                          value={withdrawTo}
                          onChange={(e) => setWithdrawTo(e.target.value)}
                          placeholder="username or 0x address"
                          className="w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-900 ring-1 ring-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-zinc-300"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                          Amount
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder="0.00"
                            className="flex-1 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-900 ring-1 ring-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-zinc-300"
                          />
                          <select
                            value={withdrawToken}
                            onChange={(e) => setWithdrawToken(e.target.value)}
                            className="rounded-xl bg-zinc-50 px-3 py-3 text-sm font-medium text-zinc-900 ring-1 ring-zinc-100 focus:outline-none focus:ring-zinc-300"
                          >
                            {TOKEN_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        {balances[withdrawToken] && (
                          <p className="mt-1 text-[10px] text-zinc-400">
                            Available:{" "}
                            <button
                              onClick={() => setWithdrawAmount(balances[withdrawToken])}
                              className="underline hover:text-zinc-600"
                            >
                              {parseFloat(balances[withdrawToken]).toFixed(4)}{" "}
                              {withdrawToken}
                            </button>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                          Password
                        </label>
                        <input
                          type="password"
                          value={withdrawPassword}
                          onChange={(e) => setWithdrawPassword(e.target.value)}
                          placeholder="Confirm with your password"
                          className="w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-900 ring-1 ring-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-zinc-300"
                        />
                      </div>

                      {withdrawError && (
                        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                          <p className="text-xs text-red-600">{withdrawError}</p>
                        </div>
                      )}

                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleWithdraw}
                        disabled={
                          !withdrawTo ||
                          !withdrawAmount ||
                          !withdrawPassword ||
                          isWithdrawing
                        }
                        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 text-sm font-medium text-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isWithdrawing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending
                          </>
                        ) : (
                          <>
                            Send {withdrawAmount || "0"} {withdrawToken}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </motion.button>
                      <p className="text-center text-[10px] text-zinc-400">
                        Gasless · Powered by Starkzap
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Stash modal (Vesu) */}
      <AnimatePresence>
        {showStash && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isStashing && setShowStash(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-4"
            >
              <div className="card-elevated p-6">
                {stashSuccess !== null ? (
                  <div className="py-4 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50"
                    >
                      <Sparkles className="h-8 w-8 text-amber-500" />
                    </motion.div>
                    <p className="text-lg font-semibold text-zinc-900">
                      {stashAction === "deposit" ? "Earning yield" : "Withdrawn"}
                    </p>
                    {stashSuccess && (
                      <a
                        href={stashSuccess}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-zinc-400 underline"
                      >
                        View on explorer
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        {stashAction === "deposit" ? "Stash to Vesu" : "Withdraw from Vesu"}
                      </h2>
                      <button
                        onClick={() => !isStashing && setShowStash(false)}
                        className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mb-5 text-[12px] text-zinc-500">
                      {stashAction === "deposit"
                        ? "Earn yield on idle balance via Vesu lending. You can withdraw anytime."
                        : "Pull funds back from your Vesu position to your wallet."}
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                          Token
                        </label>
                        <div className="flex gap-1.5">
                          {(vesuMarkets.length > 0
                            ? vesuMarkets.map((m) => m.tokenSymbol)
                            : ["USDC", "STRK", "ETH"]).map((t) => (
                            <button
                              key={t}
                              onClick={() => setStashToken(t)}
                              className={`flex-1 rounded-xl py-2.5 text-[12px] font-medium transition-colors ${
                                stashToken === t
                                  ? "bg-zinc-900 text-white"
                                  : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        {vesuMarkets.find((m) => m.tokenSymbol === stashToken)
                          ?.apy != null && (
                          <p className="mt-1.5 text-[10px] text-amber-600">
                            ~{vesuMarkets.find((m) => m.tokenSymbol === stashToken)?.apy?.toFixed(1)}% APY
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                          Amount
                        </label>
                        <input
                          type="number"
                          value={stashAmount}
                          onChange={(e) => setStashAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-900 ring-1 ring-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-zinc-300"
                        />
                        {stashAction === "deposit" && balances[stashToken] && (
                          <p className="mt-1 text-[10px] text-zinc-400">
                            Available:{" "}
                            <button
                              onClick={() => setStashAmount(balances[stashToken])}
                              className="underline hover:text-zinc-600"
                            >
                              {parseFloat(balances[stashToken]).toFixed(4)} {stashToken}
                            </button>
                          </p>
                        )}
                        {stashAction === "withdraw" &&
                          vesuPositions.find((p) => p.tokenSymbol === stashToken) && (
                            <p className="mt-1 text-[10px] text-zinc-400">
                              In vault:{" "}
                              <button
                                onClick={() =>
                                  setStashAmount(
                                    vesuPositions.find(
                                      (p) => p.tokenSymbol === stashToken
                                    )!.deposited
                                  )
                                }
                                className="underline hover:text-zinc-600"
                              >
                                {parseFloat(
                                  vesuPositions.find(
                                    (p) => p.tokenSymbol === stashToken
                                  )!.deposited
                                ).toFixed(4)}{" "}
                                {stashToken}
                              </button>
                            </p>
                          )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                          Password
                        </label>
                        <input
                          type="password"
                          value={stashPassword}
                          onChange={(e) => setStashPassword(e.target.value)}
                          placeholder="Confirm with your password"
                          className="w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-900 ring-1 ring-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-zinc-300"
                        />
                      </div>

                      {stashError && (
                        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                          <p className="text-xs text-red-600">{stashError}</p>
                        </div>
                      )}

                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleStash}
                        disabled={!stashAmount || !stashPassword || isStashing}
                        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-500 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isStashing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {stashAction === "deposit" ? "Stashing" : "Withdrawing"}
                          </>
                        ) : (
                          <>
                            {stashAction === "deposit" ? "Stash" : "Withdraw"}{" "}
                            {stashAmount || "0"} {stashToken}
                          </>
                        )}
                      </motion.button>
                      <p className="text-center text-[10px] text-zinc-400">
                        Vesu Lending · Gasless · Powered by Starkzap
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Swap modal (AVNU) */}
      <AnimatePresence>
        {showSwap && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSwapping && setShowSwap(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-4"
            >
              <div className="card-elevated p-6">
                {swapSuccess !== null ? (
                  <div className="py-4 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"
                    >
                      <Check className="h-8 w-8 text-emerald-500" />
                    </motion.div>
                    <p className="text-lg font-semibold text-zinc-900">Swapped</p>
                    {swapSuccess && (
                      <a
                        href={swapSuccess}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-zinc-400 underline"
                      >
                        View on explorer
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                        <ArrowLeftRight className="h-4 w-4" />
                        Swap tokens
                      </h2>
                      <button
                        onClick={() => !isSwapping && setShowSwap(false)}
                        className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* From */}
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                            From
                          </span>
                          {balances[swapFrom] && (
                            <button
                              onClick={() => setSwapAmount(balances[swapFrom])}
                              className="text-[10px] text-zinc-500 hover:text-zinc-900"
                            >
                              Max: {parseFloat(balances[swapFrom]).toFixed(4)}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={swapAmount}
                            onChange={(e) => setSwapAmount(e.target.value)}
                            placeholder="0.00"
                            className="flex-1 border-0 bg-transparent text-2xl font-semibold text-zinc-900 placeholder:text-zinc-300 focus:outline-none tabular"
                          />
                          <select
                            value={swapFrom}
                            onChange={(e) => setSwapFrom(e.target.value)}
                            className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 ring-1 ring-zinc-200 focus:outline-none"
                          >
                            {["STRK", "USDC", "ETH", "USDT", "DAI"].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Swap arrow */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            setSwapFrom(swapTo);
                            setSwapTo(swapFrom);
                          }}
                          className="rounded-full bg-zinc-900 p-2 text-white shadow-md hover:scale-110 transition-transform"
                        >
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* To */}
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                          To
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="flex-1 text-2xl font-semibold text-zinc-900 tabular">
                            {swapQuote?.amountOut ?? "0.00"}
                          </p>
                          <select
                            value={swapTo}
                            onChange={(e) => setSwapTo(e.target.value)}
                            className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 ring-1 ring-zinc-200 focus:outline-none"
                          >
                            {["USDC", "STRK", "ETH", "USDT", "DAI"].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <input
                          type="password"
                          value={swapPassword}
                          onChange={(e) => setSwapPassword(e.target.value)}
                          placeholder="Confirm with your password"
                          className="w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-900 ring-1 ring-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-zinc-300"
                        />
                      </div>

                      {swapError && (
                        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                          <p className="text-xs text-red-600">{swapError}</p>
                        </div>
                      )}

                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSwap}
                        disabled={
                          !swapAmount ||
                          !swapPassword ||
                          isSwapping ||
                          swapFrom === swapTo
                        }
                        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isSwapping ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Swapping
                          </>
                        ) : (
                          <>
                            Swap {swapFrom} → {swapTo}
                          </>
                        )}
                      </motion.button>
                      <p className="text-center text-[10px] text-zinc-400">
                        AVNU · Gasless · Powered by Starkzap
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
