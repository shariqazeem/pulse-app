import { query } from "./db";

export interface PulseTip {
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

function rowToTip(row: Record<string, unknown>): PulseTip {
  return {
    id: row.id as number,
    sessionId: row.session_id as string,
    tipperUsername: row.tipper_username as string | undefined,
    tipperDisplayName: row.tipper_display_name as string | undefined,
    amount: parseFloat(String(row.amount ?? 0)),
    token: row.token as string,
    message: row.message as string | undefined,
    txHash: row.tx_hash as string | undefined,
    createdAt: String(row.created_at),
  };
}

export async function logTip(
  sessionId: string,
  amount: number,
  token: string,
  options: {
    tipperUsername?: string;
    tipperDisplayName?: string;
    message?: string;
    txHash?: string;
  } = {}
): Promise<PulseTip> {
  const rows = await query(
    `INSERT INTO pulse_tips (session_id, amount, token, tipper_username, tipper_display_name, message, tx_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      sessionId,
      amount,
      token,
      options.tipperUsername ?? null,
      options.tipperDisplayName ?? null,
      options.message ?? null,
      options.txHash ?? null,
    ]
  );
  return rowToTip(rows[0]);
}

export async function getTipsForSession(
  sessionId: string,
  limit = 100
): Promise<PulseTip[]> {
  const rows = await query(
    `SELECT * FROM pulse_tips
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [sessionId, limit]
  );
  return rows.map(rowToTip);
}

export async function getNewTipsSince(
  sessionId: string,
  sinceId: number
): Promise<PulseTip[]> {
  const rows = await query(
    `SELECT * FROM pulse_tips
     WHERE session_id = $1 AND id > $2
     ORDER BY id ASC`,
    [sessionId, sinceId]
  );
  return rows.map(rowToTip);
}

export interface LeaderboardEntry {
  displayName: string;
  totalAmount: number;
  tipCount: number;
}

export async function getLeaderboard(
  sessionId: string,
  limit = 10
): Promise<LeaderboardEntry[]> {
  const rows = await query(
    `SELECT
       COALESCE(tipper_display_name, tipper_username, 'Anonymous') as display_name,
       SUM(amount) as total_amount,
       COUNT(*) as tip_count
     FROM pulse_tips
     WHERE session_id = $1
     GROUP BY COALESCE(tipper_display_name, tipper_username, 'Anonymous')
     ORDER BY total_amount DESC
     LIMIT $2`,
    [sessionId, limit]
  );
  return rows.map((r) => ({
    displayName: r.display_name as string,
    totalAmount: parseFloat(String(r.total_amount ?? 0)),
    tipCount: parseInt(String(r.tip_count ?? 0)),
  }));
}
