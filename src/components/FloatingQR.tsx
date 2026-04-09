"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Minimize2, Maximize2, X, Pin, Move } from "lucide-react";

interface FloatingQRProps {
  url: string;
  sessionId: string;
  totalRaised: number;
  tipCount: number;
  hostName: string;
  initiallyPinned?: boolean;
  onUnpin?: () => void;
}

type Mode = "expanded" | "compact" | "mini";

export function FloatingQR({
  url,
  sessionId,
  totalRaised,
  tipCount,
  hostName,
  initiallyPinned = false,
  onUnpin,
}: FloatingQRProps) {
  const [mode, setMode] = useState<Mode>("expanded");
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Auto-position to bottom-right on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPosition({
        x: window.innerWidth - 320 - 24,
        y: window.innerHeight - 380 - 24,
      });
    }
  }, []);

  const sizes = {
    expanded: { w: 320, h: 380 },
    compact: { w: 220, h: 220 },
    mini: { w: 140, h: 60 },
  };

  return (
    <>
      <div
        ref={constraintsRef}
        className="pointer-events-none fixed inset-0 z-50"
      />

      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{
          scale: 1,
          opacity: 1,
          y: 0,
          x: position.x,
          width: sizes[mode].w,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        style={{
          position: "fixed",
          top: position.y,
          left: 0,
          zIndex: 60,
        }}
        className="floating-widget"
      >
        <div className="floating-widget-card">
          <AnimatePresence mode="wait">
            {/* Expanded mode */}
            {mode === "expanded" && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-5"
              >
                {/* Drag handle + controls */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Move className="h-3 w-3 text-zinc-300" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                      Live · {hostName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMode("compact")}
                      className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      <Minimize2 className="h-3 w-3" />
                    </button>
                    {onUnpin && (
                      <button
                        onClick={onUnpin}
                        className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* QR */}
                <div className="flex justify-center rounded-2xl bg-white p-3 ring-1 ring-zinc-100">
                  <QRCodeSVG
                    value={url}
                    size={180}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#09090B"
                    marginSize={0}
                  />
                </div>

                {/* Stats */}
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                      Raised
                    </p>
                    <p className="text-xl font-semibold tracking-tight text-zinc-900 tabular">
                      {totalRaised.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                      Tips
                    </p>
                    <p className="text-xl font-semibold tracking-tight text-zinc-900 tabular">
                      {tipCount}
                    </p>
                  </div>
                </div>

                <p className="mt-3 truncate text-center text-[10px] text-zinc-400">
                  {url.replace(/^https?:\/\//, "")}
                </p>
              </motion.div>
            )}

            {/* Compact mode (just QR) */}
            {mode === "compact" && (
              <motion.div
                key="compact"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Move className="h-2.5 w-2.5 text-zinc-300" />
                    <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                      Tip · {totalRaised.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setMode("mini")}
                      className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      <Minimize2 className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={() => setMode("expanded")}
                      className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      <Maximize2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-center">
                  <QRCodeSVG
                    value={url}
                    size={170}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#09090B"
                    marginSize={0}
                  />
                </div>
              </motion.div>
            )}

            {/* Mini mode (just text + tiny QR) */}
            {mode === "mini" && (
              <motion.div
                key="mini"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 p-2.5"
              >
                <div className="rounded-lg bg-white p-1 ring-1 ring-zinc-100">
                  <QRCodeSVG
                    value={url}
                    size={36}
                    level="L"
                    bgColor="#FFFFFF"
                    fgColor="#09090B"
                    marginSize={0}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                    Raised
                  </p>
                  <p className="text-sm font-semibold leading-none text-zinc-900 tabular truncate">
                    {totalRaised.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => setMode("expanded")}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <Maximize2 className="h-2.5 w-2.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
