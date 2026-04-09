"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

/**
 * OBS Browser Source Overlay
 *
 * Add this URL as a Browser Source in OBS:
 *   https://onpulse.vercel.app/embed/{sessionId}
 *
 * Settings:
 *   Width: 400, Height: 600
 *   ✅ Shutdown source when not visible
 *   Custom CSS: body { background: transparent !important; }
 *
 * Tips appear in real-time with animations.
 * Transparent background — layers on top of game/camera.
 */

interface PulseTip {
  id: number;
  tipperDisplayName?: string;
  amount: number;
  token: string;
  message?: string;
  createdAt: string;
}

interface SessionInfo {
  id: string;
  hostUsername: string;
  title: string;
  totalRaised: number;
  tipCount: number;
  status: string;
}

export default function OBSOverlay() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [recentTip, setRecentTip] = useState<PulseTip | null>(null);
  const [origin, setOrigin] = useState("");
  const seenIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Fetch session
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSession(data);
      })
      .catch(() => {});
  }, [sessionId]);

  // SSE feed
  useEffect(() => {
    if (!sessionId) return;
    const eventSource = new EventSource(`/api/sessions/${sessionId}/feed`);

    eventSource.addEventListener("session", (e) => {
      try {
        setSession(JSON.parse((e as MessageEvent).data));
      } catch {}
    });

    eventSource.addEventListener("tip", (e) => {
      try {
        const tip: PulseTip = JSON.parse((e as MessageEvent).data);
        if (seenIds.current.has(tip.id)) return;
        seenIds.current.add(tip.id);

        setRecentTip(tip);
        setTimeout(() => setRecentTip(null), 5000);

        // Re-fetch session from DB for accurate totals
        fetch(`/api/sessions/${sessionId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data) setSession(data); })
          .catch(() => {});
      } catch {}
    });

    return () => eventSource.close();
  }, [sessionId]);

  const tipUrl = `${origin}/tip/${sessionId}`;

  if (!session || !origin) return null;

  return (
    <div
      className="relative flex h-screen w-screen flex-col items-center justify-end p-6"
      style={{ background: "transparent" }}
    >
      {/* Tip burst — appears for 5 seconds then fades */}
      <AnimatePresence>
        {recentTip && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
          >
            <div
              className="rounded-3xl px-10 py-8 text-center"
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                boxShadow:
                  "0 24px 60px rgba(0,0,0,0.15), 0 0 80px rgba(245, 158, 11, 0.3)",
              }}
            >
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-amber-500">
                New tip
              </p>
              <p className="mt-3 text-[72px] font-extralight leading-none tracking-[-0.04em] text-zinc-900"
                style={{ fontFeatureSettings: '"tnum" 1' }}
              >
                {recentTip.amount.toFixed(2)}
              </p>
              <p className="mt-2 text-lg font-medium text-zinc-500">
                {recentTip.token} from{" "}
                <span className="text-zinc-900">
                  {recentTip.tipperDisplayName ?? "Anonymous"}
                </span>
              </p>
              {recentTip.message && (
                <p className="mt-3 max-w-xs text-sm italic text-zinc-500">
                  &ldquo;{recentTip.message}&rdquo;
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar: QR + stats (always visible) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5"
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(16px)",
          borderRadius: 20,
          padding: "14px 20px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div className="rounded-xl bg-white p-2">
          <QRCodeSVG
            value={tipUrl}
            size={64}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#09090B"
            marginSize={0}
          />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
            Raised
          </p>
          <p
            className="text-3xl font-semibold tracking-tight text-zinc-900"
            style={{ fontFeatureSettings: '"tnum" 1' }}
          >
            {session.totalRaised.toFixed(2)}
          </p>
          <p className="text-[10px] text-zinc-400">
            {session.tipCount} {session.tipCount === 1 ? "tip" : "tips"} ·
            Scan to tip
          </p>
        </div>
      </motion.div>
    </div>
  );
}
