import { query, queryOne } from "./db";

export interface PulseSession {
  id: string;
  hostUsername: string;
  title: string;
  description?: string;
  status: "live" | "ended";
  totalRaised: number;
  tipCount: number;
  createdAt: string;
  endedAt?: string;
}

function rowToSession(row: Record<string, unknown>): PulseSession {
  return {
    id: row.id as string,
    hostUsername: row.host_username as string,
    title: (row.title as string) ?? "",
    description: row.description as string | undefined,
    status: (row.status as "live" | "ended") ?? "live",
    totalRaised: parseFloat(String(row.total_raised ?? 0)),
    tipCount: (row.tip_count as number) ?? 0,
    createdAt: String(row.created_at),
    endedAt: row.ended_at ? String(row.ended_at) : undefined,
  };
}

function generateSessionId(): string {
  // Short readable ID like "a8x9k2"
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export async function createSession(
  hostUsername: string,
  title: string,
  description?: string
): Promise<PulseSession> {
  const id = generateSessionId();
  await query(
    `INSERT INTO pulse_sessions (id, host_username, title, description)
     VALUES ($1, $2, $3, $4)`,
    [id, hostUsername.toLowerCase(), title, description ?? null]
  );
  const row = await queryOne(
    `SELECT * FROM pulse_sessions WHERE id = $1`,
    [id]
  );
  return rowToSession(row!);
}

export async function getSession(id: string): Promise<PulseSession | null> {
  const row = await queryOne(
    `SELECT * FROM pulse_sessions WHERE id = $1`,
    [id]
  );
  return row ? rowToSession(row) : null;
}

export async function endSession(id: string): Promise<PulseSession | null> {
  await query(
    `UPDATE pulse_sessions SET status = 'ended', ended_at = NOW() WHERE id = $1`,
    [id]
  );
  return getSession(id);
}

export async function getSessionsByHost(
  username: string
): Promise<PulseSession[]> {
  const rows = await query(
    `SELECT * FROM pulse_sessions WHERE host_username = $1 ORDER BY created_at DESC`,
    [username.toLowerCase()]
  );
  return rows.map(rowToSession);
}

export async function incrementSessionStats(
  id: string,
  amount: number
): Promise<void> {
  await query(
    `UPDATE pulse_sessions
     SET total_raised = total_raised + $1, tip_count = tip_count + 1
     WHERE id = $2`,
    [amount, id]
  );
}
