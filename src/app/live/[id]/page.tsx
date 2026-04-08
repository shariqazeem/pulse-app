"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Trophy, Zap, X } from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";

interface PulseTip {
  id: number;
  sessionId: string;
  tipperUsername?: string;
  tipperDisplayName?: string;
  amount: number;
  token: string;
  message?: string;
  txHash?: string;
  createdAt: string;
}

interface PulseSession {
  id: string;
  hostUsername: string;
  title: string;
  status: "live" | "ended";
  totalRaised: number;
  tipCount: number;
  createdAt: string;
}

interface LeaderboardEntry {
  displayName: string;
  totalAmount: number;
  tipCount: number;
}

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) =>
    v.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })
  );

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1,
      ease: [0.32, 0.72, 0, 1],
    });
    return controls.stop;
  }, [value, motionValue]);

  return <motion.span className="tabular">{display}</motion.span>;
}

export default function LiveSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;
  const { playChime } = useHaptics();

  const [session, setSession] = useState<PulseSession | null>(null);
  const [tips, setTips] = useState<PulseTip[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentBurst, setRecentBurst] = useState<PulseTip | null>(null);
  const [origin, setOrigin] = useState("");
  const [notFound, setNotFound] = useState(false);
  const seenTipIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Initial session fetch
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSession(data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [sessionId]);

  // Periodic leaderboard refresh
  const refreshLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard ?? []);
      }
    } catch {}
  }, [sessionId]);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  // SSE feed for live tips
  useEffect(() => {
    if (!sessionId) return;
    const eventSource = new EventSource(`/api/sessions/${sessionId}/feed`);

    eventSource.addEventListener("session", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setSession(data);
      } catch {}
    });

    eventSource.addEventListener("tip", (e) => {
      try {
        const tip: PulseTip = JSON.parse((e as MessageEvent).data);
        if (seenTipIds.current.has(tip.id)) return;
        seenTipIds.current.add(tip.id);

        setTips((prev) => [tip, ...prev].slice(0, 20));
        setSession((prev) =>
          prev
            ? {
                ...prev,
                totalRaised: prev.totalRaised + tip.amount,
                tipCount: prev.tipCount + 1,
              }
            : prev
        );
        setRecentBurst(tip);
        playChime();
        setTimeout(() => setRecentBurst(null), 4000);
        refreshLeaderboard();
      } catch (err) {
        console.error("Tip parse error:", err);
      }
    });

    eventSource.onerror = () => {
      console.warn("SSE connection error");
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId, playChime, refreshLeaderboard]);

  const endSession = useCallback(async () => {
    if (!confirm("End this session?")) return;
    await fetch(`/api/sessions/${sessionId}`, { method: "PATCH" });
    router.push(`/`);
  }, [sessionId, router]);

  const tipUrl = `${origin}/tip/${sessionId}`;

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFDFD]">
        <div className="text-center">
          <p className="text-base font-medium text-zinc-900">Session not found</p>
          <button onClick={() => router.push("/")} className="btn mt-4">
            Go home
          </button>
        </div>
      </div>
    );
  }

  if (!session || !origin) {
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FDFDFD]">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-zinc-200/30 blur-[120px]" />
      </div>

      {/* End session button */}
      <button
        onClick={endSession}
        className="absolute right-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition-colors hover:text-zinc-900"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Title */}
      <div className="absolute left-1/2 top-6 z-20 -translate-x-1/2">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">
          Live Session
        </p>
        <p className="mt-1 text-center text-sm font-medium text-zinc-900">
          {session.title}
        </p>
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-8 px-6 py-24 lg:grid-cols-[1.2fr_1fr]">
        {/* Left: QR + Total */}
        <div className="flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="card-elevated flex flex-col items-center p-8 sm:p-10"
          >
            <div className="rounded-[20px] bg-white p-4 ring-1 ring-zinc-100">
              <QRCodeSVG
                value={tipUrl}
                size={240}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#09090B"
                marginSize={0}
              />
            </div>
            <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              Scan to tip
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900">
              {origin.replace(/^https?:\/\//, "")}/tip/{sessionId}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              Total Raised
            </p>
            <h1 className="mt-2 text-[80px] font-extralight leading-none tracking-[-0.04em] text-zinc-900">
              <AnimatedNumber value={session.totalRaised} />
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {session.tipCount} {session.tipCount === 1 ? "tip" : "tips"}
            </p>
          </motion.div>
        </div>

        {/* Right: Leaderboard + Recent Tips */}
        <div className="flex flex-col gap-6 lg:pt-12">
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="card p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                Top Tippers
              </p>
            </div>
            {leaderboard.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400">
                Be the first to tip
              </p>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {leaderboard.slice(0, 5).map((entry, i) => (
                    <motion.div
                      key={entry.displayName}
                      layout
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                            i === 0
                              ? "bg-amber-100 text-amber-700"
                              : i === 1
                                ? "bg-zinc-100 text-zinc-700"
                                : i === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-zinc-50 text-zinc-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-zinc-900">
                          {entry.displayName}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-zinc-900 tabular">
                        {entry.totalAmount.toFixed(2)}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Recent Tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="card flex-1 p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-zinc-400" />
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                Recent Tips
              </p>
            </div>
            {tips.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400">
                Waiting for first tip...
              </p>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {tips.slice(0, 8).map((tip) => (
                    <motion.div
                      key={tip.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {tip.tipperDisplayName ?? "Anonymous"}
                        </p>
                        {tip.message && (
                          <p className="mt-0.5 text-xs italic text-zinc-500">
                            &ldquo;{tip.message}&rdquo;
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-medium text-zinc-900 tabular">
                        {tip.amount.toFixed(2)} {tip.token}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Big tip burst overlay */}
      <AnimatePresence>
        {recentBurst && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="pointer-events-none fixed left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="card-elevated px-10 py-8 text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">
                New tip
              </p>
              <p className="mt-3 text-[80px] font-extralight leading-none tracking-[-0.04em] text-zinc-900 tabular">
                {recentBurst.amount.toFixed(2)}
              </p>
              <p className="mt-2 text-base font-medium text-zinc-500">
                {recentBurst.token} from{" "}
                <span className="text-zinc-900">
                  {recentBurst.tipperDisplayName ?? "Anonymous"}
                </span>
              </p>
              {recentBurst.message && (
                <p className="mt-3 max-w-xs text-sm italic text-zinc-500">
                  &ldquo;{recentBurst.message}&rdquo;
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
