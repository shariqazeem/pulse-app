import { query, queryOne } from "./db";

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: string;
  token: string;
  description: string;
  createdAt: string;
}

export interface UserRecord {
  address: string;
  createdAt: string;
  autoYield: boolean;
  preferredToken: string;
  products: Product[];
  passwordHash?: string;
  passwordSalt?: string;
  privyWalletId?: string;
  privyAddress?: string;
  privyPublicKey?: string;
  telegramUsername?: string;
  telegramId?: number;
}

type UsersMap = Record<string, UserRecord>;

function rowToUser(row: Record<string, unknown>): UserRecord {
  return {
    address: (row.address as string) ?? "0x0",
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
    autoYield: (row.auto_yield as boolean) ?? false,
    preferredToken: (row.preferred_token as string) ?? "USDC",
    products: (row.products as Product[]) ?? [],
    passwordHash: row.password_hash as string | undefined,
    passwordSalt: row.password_salt as string | undefined,
    privyWalletId: row.privy_wallet_id as string | undefined,
    privyAddress: row.privy_address as string | undefined,
    privyPublicKey: row.privy_public_key as string | undefined,
    telegramUsername: row.telegram_username as string | undefined,
    telegramId: row.telegram_id as number | undefined,
  };
}

export async function getUser(username: string): Promise<UserRecord | null> {
  const row = await queryOne(
    "SELECT * FROM users WHERE username = $1",
    [username.toLowerCase()]
  );
  return row ? rowToUser(row) : null;
}

export async function readUsers(): Promise<UsersMap> {
  const rows = await query("SELECT username, * FROM users");
  const map: UsersMap = {};
  for (const row of rows) {
    map[row.username as string] = rowToUser(row);
  }
  return map;
}

export async function writeUsers(users: UsersMap): Promise<void> {
  for (const [username, user] of Object.entries(users)) {
    await query(
      `INSERT INTO users (username, address, created_at, auto_yield, preferred_token, products,
        password_hash, password_salt, privy_wallet_id, privy_address, privy_public_key,
        telegram_username, telegram_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (username) DO UPDATE SET
        address=EXCLUDED.address, auto_yield=EXCLUDED.auto_yield,
        preferred_token=EXCLUDED.preferred_token, products=EXCLUDED.products,
        password_hash=EXCLUDED.password_hash, password_salt=EXCLUDED.password_salt,
        privy_wallet_id=EXCLUDED.privy_wallet_id, privy_address=EXCLUDED.privy_address,
        privy_public_key=EXCLUDED.privy_public_key, telegram_username=EXCLUDED.telegram_username,
        telegram_id=EXCLUDED.telegram_id`,
      [
        username, user.address, user.createdAt, user.autoYield, user.preferredToken,
        JSON.stringify(user.products), user.passwordHash, user.passwordSalt,
        user.privyWalletId, user.privyAddress, user.privyPublicKey,
        user.telegramUsername ?? null, user.telegramId ?? null,
      ]
    );
  }
}

export async function updateUser(
  username: string,
  updates: Record<string, unknown>
): Promise<UserRecord | null> {
  const user = await getUser(username);
  if (!user) return null;

  const fieldMap: Record<string, string> = {
    autoYield: "auto_yield",
    preferredToken: "preferred_token",
    telegramUsername: "telegram_username",
    telegramId: "telegram_id",
    privyWalletId: "privy_wallet_id",
    privyAddress: "privy_address",
    privyPublicKey: "privy_public_key",
    address: "address",
    passwordHash: "password_hash",
    passwordSalt: "password_salt",
    products: "products",
  };

  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(updates)) {
    const col = fieldMap[key] ?? key;
    sets.push(`${col} = $${idx}`);
    vals.push(key === "products" ? JSON.stringify(val) : val);
    idx++;
  }

  if (sets.length === 0) return user;

  vals.push(username.toLowerCase());
  await query(`UPDATE users SET ${sets.join(", ")} WHERE username = $${idx}`, vals);

  return getUser(username);
}
