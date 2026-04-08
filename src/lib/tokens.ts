import { TOKEN_ADDRESSES } from "./constants";

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoUrl: string;
}

export const TOKENS: Record<string, TokenInfo> = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    address: TOKEN_ADDRESSES.ETH,
    decimals: 18,
    logoUrl: "/tokens/eth.svg",
  },
  STRK: {
    symbol: "STRK",
    name: "Starknet",
    address: TOKEN_ADDRESSES.STRK,
    decimals: 18,
    logoUrl: "/tokens/strk.svg",
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: TOKEN_ADDRESSES.USDC,
    decimals: 6,
    logoUrl: "/tokens/usdc.svg",
  },
  USDT: {
    symbol: "USDT",
    name: "Tether",
    address: TOKEN_ADDRESSES.USDT,
    decimals: 6,
    logoUrl: "/tokens/usdt.svg",
  },
  DAI: {
    symbol: "DAI",
    name: "Dai",
    address: TOKEN_ADDRESSES.DAI,
    decimals: 18,
    logoUrl: "/tokens/dai.svg",
  },
};

export const TOKEN_LIST = Object.values(TOKENS);

export function getToken(symbol: string): TokenInfo | undefined {
  return TOKENS[symbol.toUpperCase()];
}

export function getTokenByAddress(address: string): TokenInfo | undefined {
  return TOKEN_LIST.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
}
