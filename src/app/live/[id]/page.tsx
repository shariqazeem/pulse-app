"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Trophy,
  Zap,
  X,
  Pin,
  PinOff,
  Copy,
  Check,
  PictureInPicture2,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { useHaptics } from "@/hooks/useHaptics";
import { FloatingQR } from "@/components/FloatingQR";
import { PictureInPictureQR } from "@/components/PictureInPictureQR";
import { AmbientBackground } from "@/components/AmbientBackground";

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
      duration: 1.2,
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
  const [isPinned, setIsPinned] = useState(false);
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pulseFlash, setPulseFlash] = useState(false);
  const seenTipIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    setOrigin(window.location.origin);
    setPipSupported(typeof window !== "undefined" && "documentPictureInPicture" in window);
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

  // Fetch existing tips on mount
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/tips`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tips) {
          setTips(data.tips);
          for (const t of data.tips) seenTipIds.current.add(t.id);
        }
      })
      .catch(() => {});
  }, [sessionId]);

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

  // SSE feed
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
        setRecentBurst(tip);
        setPulseFlash(true);
        playChime();
        setTimeout(() => setPulseFlash(false), 1500);
        setTimeout(() => setRecentBurst(null), 4500);

        // Re-fetch session from DB for accurate totals (no manual addition)
        fetch(`/api/sessions/${sessionId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data) setSession(data); })
          .catch(() => {});
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

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(tipUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tipUrl]);

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
      <AmbientBackground />

      {/* Pulse flash on tip arrival */}
      <AnimatePresence>
        {pulseFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none fixed inset-0 z-10"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-100/30 via-transparent to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">
            Live Session
          </p>
          <p className="mt-0.5 text-sm font-medium text-zinc-900">
            {session.title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200 transition-colors hover:text-zinc-900"
              title="Dashboard"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Dashboard
            </motion.button>
          </Link>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyLink}
            className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200 transition-colors hover:text-zinc-900"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy link"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              navigator.clipboard.writeText(`${origin}/embed/${sessionId}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200 transition-colors hover:text-zinc-900"
            title="Copy OBS overlay URL"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            OBS
          </motion.button>

          {pipSupported && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsPiPOpen(!isPiPOpen)}
              className={`flex h-10 items-center gap-2 rounded-full px-4 text-xs font-medium shadow-sm ring-1 transition-all ${
                isPiPOpen
                  ? "bg-amber-500 text-white ring-amber-500"
                  : "bg-white text-zinc-600 ring-zinc-200 hover:text-zinc-900"
              }`}
              title="Pop out — visible across all tabs"
            >
              <PictureInPicture2 className="h-3.5 w-3.5" />
              {isPiPOpen ? "Popped out" : "Pop out"}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPinned(!isPinned)}
            className={`flex h-10 items-center gap-2 rounded-full px-4 text-xs font-medium shadow-sm ring-1 transition-all ${
              isPinned
                ? "bg-zinc-900 text-white ring-zinc-900"
                : "bg-white text-zinc-600 ring-zinc-200 hover:text-zinc-900"
            }`}
          >
            {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            {isPinned ? "Unpin" : "Pin"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={endSession}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition-colors hover:text-zinc-900"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-12 px-6 py-28 lg:grid-cols-[1.1fr_1fr]">
        {/* Left: QR + Total */}
        <div className="flex flex-col items-center justify-center">
          <AnimatePresence>
            {!isPinned && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.9 }}
                transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                className="card-elevated flex flex-col items-center p-10"
              >
                <motion.div
                  animate={
                    pulseFlash
                      ? {
                          scale: [1, 1.04, 1],
                          boxShadow: [
                            "0 0 0 0 rgba(245, 158, 11, 0)",
                            "0 0 0 16px rgba(245, 158, 11, 0.15)",
                            "0 0 0 0 rgba(245, 158, 11, 0)",
                          ],
                        }
                      : {}
                  }
                  transition={{ duration: 1 }}
                  className="rounded-[20px] bg-white p-4 ring-1 ring-zinc-100"
                >
                  <QRCodeSVG
                    value={tipUrl}
                    size={260}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#09090B"
                    marginSize={0}
                  />
                </motion.div>
                <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                  Scan to tip
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  pulse/{session.hostUsername}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* When pinned, show a placeholder */}
          {isPinned && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-zinc-100">
                <Pin className="h-10 w-10 text-zinc-400" />
              </div>
              <p className="mt-6 text-base font-medium text-zinc-900">
                QR pinned
              </p>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">
                Drag the floating widget anywhere on screen. Use Pulse while
                you continue your work.
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="mt-10 text-center"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              Total Raised
            </p>
            <h1 className="mt-3 text-[88px] font-extralight leading-none tracking-[-0.045em] text-zinc-900">
              <AnimatedNumber value={session.totalRaised} />
            </h1>
            <p className="mt-3 text-sm text-zinc-500">
              {session.tipCount} {session.tipCount === 1 ? "tip" : "tips"}
            </p>
          </motion.div>
        </div>

        {/* Right: Leaderboard + Recent Tips */}
        <div className="flex flex-col gap-5 lg:pt-12">
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="card p-6"
          >
            <div className="mb-5 flex items-center gap-2">
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
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
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
                      <span className="text-sm font-semibold text-zinc-900 tabular">
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
            transition={{ delay: 0.6, duration: 0.7 }}
            className="card flex-1 p-6"
          >
            <div className="mb-5 flex items-center gap-2">
              <Zap className="h-4 w-4 text-zinc-400" />
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                Recent Tips
              </p>
            </div>
            {tips.length === 0 ? (
              <div className="py-8 text-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="text-sm text-zinc-400"
                >
                  Waiting for first tip...
                </motion.div>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {tips.slice(0, 8).map((tip) => (
                    <motion.div
                      key={tip.id}
                      layout
                      initial={{ opacity: 0, scale: 0.85, x: 30, filter: "blur(4px)" }}
                      animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 220,
                        damping: 20,
                      }}
                      className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {tip.tipperDisplayName ?? "Anonymous"}
                        </p>
                        {tip.message && (
                          <p className="mt-0.5 truncate text-xs italic text-zinc-500">
                            &ldquo;{tip.message}&rdquo;
                          </p>
                        )}
                      </div>
                      <p className="ml-3 text-sm font-semibold text-zinc-900 tabular">
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

      {/* Floating QR widget when pinned */}
      <AnimatePresence>
        {isPinned && (
          <FloatingQR
            url={tipUrl}
            sessionId={sessionId}
            totalRaised={session.totalRaised}
            tipCount={session.tipCount}
            hostName={session.hostUsername}
            onUnpin={() => setIsPinned(false)}
          />
        )}
      </AnimatePresence>

      {/* Picture-in-Picture browser-wide pop-out */}
      <PictureInPictureQR
        url={tipUrl}
        totalRaised={session.totalRaised}
        tipCount={session.tipCount}
        hostName={session.hostUsername}
        sessionTitle={session.title}
        isOpen={isPiPOpen}
        onClose={() => setIsPiPOpen(false)}
      />

      {/* Big tip burst overlay */}
      <AnimatePresence>
        {recentBurst && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="pointer-events-none fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 24px 60px rgba(0,0,0,0.12), 0 0 0 0 rgba(245, 158, 11, 0)",
                  "0 24px 60px rgba(0,0,0,0.12), 0 0 100px 0 rgba(245, 158, 11, 0.4)",
                  "0 24px 60px rgba(0,0,0,0.12), 0 0 0 0 rgba(245, 158, 11, 0)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="card-elevated px-12 py-10 text-center"
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-amber-500">
                ⚡ New tip
              </p>
              <p className="mt-4 text-[88px] font-extralight leading-none tracking-[-0.045em] text-zinc-900 tabular">
                {recentBurst.amount.toFixed(2)}
              </p>
              <p className="mt-3 text-base font-medium text-zinc-500">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
