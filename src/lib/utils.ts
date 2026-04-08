/**
 * Format a number as USD currency
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a token amount with appropriate decimals
 */
export function formatTokenAmount(
  amount: string | number,
  decimals: number = 4
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Truncate a Starknet address for display
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Convert a raw token amount (bigint) to a human-readable number
 */
export function fromRawAmount(raw: bigint | string, decimals: number): number {
  const value = typeof raw === "string" ? BigInt(raw) : raw;
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0");
  return parseFloat(`${whole}.${fractionStr}`);
}

/**
 * Convert a human-readable amount to raw token amount
 */
export function toRawAmount(amount: number | string, decimals: number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const multiplied = num * 10 ** decimals;
  return BigInt(Math.round(multiplied)).toString();
}

/**
 * Generate a payment page URL
 */
export function getPaymentUrl(
  username: string,
  amount?: string,
  token?: string
): string {
  let url = `/pay/${username}`;
  const params = new URLSearchParams();
  if (amount) params.set("amount", amount);
  if (token) params.set("token", token);
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/**
 * Time ago helper
 */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
