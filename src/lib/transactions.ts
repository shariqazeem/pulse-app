import { query } from "./db";

export interface TransactionRecord {
  hash: string;
  from: string;
  to: string;
  fromUsername?: string;
  toUsername?: string;
  amount: string;
  tokenSymbol: string;
  timestamp: string;
  note?: string;
  productId?: string;
  productName?: string;
}

function normalize(addr: string): string {
  return addr.toLowerCase().replace(/^0x0*/, "0x");
}

export async function logTransaction(tx: TransactionRecord): Promise<void> {
  await query(
    `INSERT INTO transactions (hash, from_addr, to_addr, from_username, to_username, amount, token_symbol, timestamp, note, product_id, product_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (hash) DO NOTHING`,
    [
      tx.hash, tx.from, tx.to, tx.fromUsername ?? null, tx.toUsername ?? null,
      tx.amount, tx.tokenSymbol, tx.timestamp, tx.note ?? null,
      tx.productId ?? null, tx.productName ?? null,
    ]
  );
}

export async function getTransactions(
  address: string,
  limit: number = 50
): Promise<TransactionRecord[]> {
  const norm = normalize(address);
  // Use REPLACE to normalize addresses in the DB too
  const rows = await query(
    `SELECT * FROM transactions
     WHERE LOWER(REGEXP_REPLACE(from_addr, '^0x0+', '0x')) = $1
        OR LOWER(REGEXP_REPLACE(to_addr, '^0x0+', '0x')) = $1
     ORDER BY timestamp DESC LIMIT $2`,
    [norm, limit]
  );

  return rows.map((r) => ({
    hash: r.hash as string,
    from: r.from_addr as string,
    to: r.to_addr as string,
    fromUsername: r.from_username as string | undefined,
    toUsername: r.to_username as string | undefined,
    amount: r.amount as string,
    tokenSymbol: r.token_symbol as string,
    timestamp: String(r.timestamp),
    note: r.note as string | undefined,
    productId: r.product_id as string | undefined,
    productName: r.product_name as string | undefined,
  }));
}
