import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

export const SOLANA_ENDPOINT = clusterApiUrl("mainnet-beta");

export function getSolanaWallets() {
  return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
}
