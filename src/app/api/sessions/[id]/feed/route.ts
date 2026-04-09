import { NextRequest } from "next/server";
import { getNewTipsSince, getTipsForSession } from "@/lib/tips";
import { getSession } from "@/lib/sessions";

export const runtime = "nodejs";

/**
 * Server-Sent Events stream of new tips for a session.
 * Host's live screen connects to this and receives updates in real-time.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let alive = true;

      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: {}\n\n`));

      // Send initial session snapshot
      const session = await getSession(id);
      if (session) {
        controller.enqueue(
          encoder.encode(
            `event: session\ndata: ${JSON.stringify(session)}\n\n`
          )
        );
      }

      // Start from the LATEST tip ID — don't replay existing tips
      const existingTips = await getTipsForSession(id, 1);
      let lastTipId = existingTips.length > 0 ? existingTips[0].id : 0;

      const interval = setInterval(async () => {
        if (!alive) return;
        try {
          const newTips = await getNewTipsSince(id, lastTipId);
          for (const tip of newTips) {
            if (tip.id > lastTipId) lastTipId = tip.id;
            const event = `event: tip\ndata: ${JSON.stringify(tip)}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
          // Heartbeat to keep connection alive
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch (e) {
          console.error("SSE poll error:", e);
        }
      }, 1500);

      req.signal.addEventListener("abort", () => {
        alive = false;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
