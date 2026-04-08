const DB_PROXY_URL = process.env.DB_PROXY_URL ?? "http://141.148.215.239:4001";
const DB_SECRET = "starkpay-db-proxy-secret-2026";

export async function query<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await fetch(`${DB_PROXY_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Secret": DB_SECRET,
    },
    body: JSON.stringify({ text, params: params ?? [] }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "DB proxy error" }));
    throw new Error((err as { error?: string }).error ?? `DB error: ${res.status}`);
  }

  const data = await res.json();
  return (data as { rows: T[] }).rows;
}

export async function queryOne<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
