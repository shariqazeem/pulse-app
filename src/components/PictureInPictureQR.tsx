"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Zap } from "lucide-react";

interface PictureInPictureQRProps {
  url: string;
  totalRaised: number;
  tipCount: number;
  hostName: string;
  sessionTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

// Type augmentation for Document Picture-in-Picture API
interface DocumentPiPWindow extends Window {
  document: Document;
}

interface DocumentPictureInPicture {
  requestWindow(options?: {
    width?: number;
    height?: number;
  }): Promise<DocumentPiPWindow>;
  window: DocumentPiPWindow | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export function PictureInPictureQR({
  url,
  totalRaised,
  tipCount,
  hostName,
  sessionTitle,
  isOpen,
  onClose,
}: PictureInPictureQRProps) {
  const [pipWindow, setPipWindow] = useState<DocumentPiPWindow | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const openingRef = useRef(false);

  const openPiP = useCallback(async () => {
    if (openingRef.current) return;
    if (!window.documentPictureInPicture) {
      alert(
        "Picture-in-Picture is not supported in your browser.\n\nUse Chrome 116+ or Edge 116+ for the floating window experience."
      );
      onClose();
      return;
    }

    openingRef.current = true;
    try {
      const win = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 420,
      });

      // Set the body class for styling
      win.document.body.style.margin = "0";
      win.document.body.style.padding = "0";
      win.document.body.style.fontFamily =
        '"Inter", -apple-system, system-ui, sans-serif';
      win.document.body.style.background = "#FDFDFD";
      win.document.body.style.color = "#09090B";
      win.document.body.style.overflow = "hidden";

      // Inline critical styles
      const style = win.document.createElement("style");
      style.textContent = `
        * { box-sizing: border-box; }
        body { -webkit-font-smoothing: antialiased; }
        .pip-container {
          padding: 20px;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .pip-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .pip-label {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #A1A1AA;
        }
        .pip-live-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: #EF4444;
          border-radius: 50%;
          margin-right: 6px;
          animation: pip-pulse 1.5s ease-in-out infinite;
        }
        @keyframes pip-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        .pip-qr-card {
          background: #FFFFFF;
          border: 1px solid #F4F4F5;
          border-radius: 16px;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }
        .pip-stats {
          margin-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .pip-stat-label {
          font-size: 9px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #A1A1AA;
        }
        .pip-stat-value {
          font-size: 26px;
          font-weight: 600;
          letter-spacing: -0.025em;
          color: #09090B;
          font-variant-numeric: tabular-nums;
          margin-top: 2px;
        }
        .pip-url {
          margin-top: 14px;
          font-size: 10px;
          text-align: center;
          color: #A1A1AA;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pip-host {
          font-size: 13px;
          font-weight: 500;
          color: #09090B;
        }
        .pip-title {
          font-size: 11px;
          color: #71717A;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pip-tip-flash {
          animation: pip-flash 1s ease-out;
        }
        @keyframes pip-flash {
          0% { background: rgba(245, 158, 11, 0); }
          25% { background: rgba(245, 158, 11, 0.15); }
          100% { background: rgba(245, 158, 11, 0); }
        }
      `;
      win.document.head.appendChild(style);

      // Create the container element to render into
      const div = win.document.createElement("div");
      div.className = "pip-container";
      win.document.body.appendChild(div);

      setPipWindow(win);
      setContainer(div);

      // Handle PiP window close
      win.addEventListener("pagehide", () => {
        setPipWindow(null);
        setContainer(null);
        onClose();
      });
    } catch (err) {
      console.error("PiP request failed:", err);
      alert("Failed to open Picture-in-Picture window.");
      onClose();
    } finally {
      openingRef.current = false;
    }
  }, [onClose]);

  // Open / close based on isOpen prop
  useEffect(() => {
    if (isOpen && !pipWindow) {
      openPiP();
    } else if (!isOpen && pipWindow) {
      try {
        pipWindow.close();
      } catch {}
      setPipWindow(null);
      setContainer(null);
    }
  }, [isOpen, pipWindow, openPiP]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipWindow) {
        try {
          pipWindow.close();
        } catch {}
      }
    };
  }, [pipWindow]);

  if (!container) return null;

  return createPortal(
    <>
      <div className="pip-header">
        <div>
          <div>
            <span className="pip-live-dot"></span>
            <span className="pip-label">Live</span>
          </div>
          <div className="pip-host" style={{ marginTop: 4 }}>
            @{hostName}
          </div>
          <div className="pip-title">{sessionTitle}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <Zap
            style={{ width: 16, height: 16, color: "#F59E0B" }}
            strokeWidth={2.5}
          />
        </div>
      </div>

      <div className="pip-qr-card">
        <QRCodeSVG
          value={url}
          size={220}
          level="M"
          bgColor="#FFFFFF"
          fgColor="#09090B"
          marginSize={0}
        />
      </div>

      <div className="pip-stats">
        <div>
          <div className="pip-stat-label">Raised</div>
          <div className="pip-stat-value">{totalRaised.toFixed(2)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="pip-stat-label">Tips</div>
          <div className="pip-stat-value">{tipCount}</div>
        </div>
      </div>

      <div className="pip-url">{url.replace(/^https?:\/\//, "")}</div>
    </>,
    container
  );
}
