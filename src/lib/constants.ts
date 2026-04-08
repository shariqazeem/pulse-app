export const APP_NAME = "StarkPay";
export const APP_DESCRIPTION = "Personal payment pages on Starknet";
// Set via NEXT_PUBLIC_APP_URL env var, or auto-detect at runtime
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export const NETWORK = "mainnet" as const;

// Starknet mainnet RPC
export const RPC_URL = "https://api.cartridge.gg/x/starknet/mainnet";

// AVNU Paymaster for gasless transactions
export const PAYMASTER_URL = "https://starknet.paymaster.avnu.fi";
export const PAYMASTER_API_KEY = process.env.NEXT_PUBLIC_PAYMASTER_API_KEY ?? "";

// Starknet mainnet token addresses
export const TOKEN_ADDRESSES = {
  ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  USDC: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
  USDT: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
  DAI: "0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3",
} as const;

export const DEFAULT_RECEIVE_TOKEN = "USDC";

export const EXPLORER_BASE_URL = "https://voyager.online";
