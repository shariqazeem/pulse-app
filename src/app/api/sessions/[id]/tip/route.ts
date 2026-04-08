import { NextRequest, NextResponse } from "next/server";
import { getSession, incrementSessionStats } from "@/lib/sessions";
import { logTip } from "@/lib/tips";
import { getUser } from "@/lib/users";

/**
 * Tipper has already executed the on-chain transaction client-side
 * (via Cartridge wallet). This endpoint just records the tip in our DB
 * so the host's live screen can pick it up via SSE.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { amount, token, displayName, message, txHash, tipperUsername } =
    body as {
      amount?: string | number;
      token?: string;
      displayName?: string;
      message?: string;
      txHash?: string;
      tipperUsername?: string;
    };

  if (amount === undefined || !token || !txHash) {
    return NextResponse.json(
      { error: "amount, token, txHash required" },
      { status: 400 }
    );
  }

  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "live") {
    return NextResponse.json({ error: "Session ended" }, { status: 410 });
  }

  // If tipperUsername is a real StarkPay user, prefer their username over displayName
  let resolvedDisplayName = displayName ?? "Anonymous";
  if (tipperUsername) {
    const user = await getUser(tipperUsername);
    if (user) resolvedDisplayName = tipperUsername;
  }

  const numericAmount = parseFloat(String(amount));

  const tip = await logTip(id, numericAmount, token, {
    tipperUsername: tipperUsername ?? undefined,
    tipperDisplayName: resolvedDisplayName,
    message,
    txHash,
  });

  await incrementSessionStats(id, numericAmount);

  return NextResponse.json(tip, { status: 201 });
}
