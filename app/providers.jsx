"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { WagmiProvider } from "wagmi";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { getConfig } from "@/lib/wagmi";
import { SOLANA_ENDPOINT, getSolanaWallets } from "@/lib/solana";

import "@solana/wallet-adapter-react-ui/styles.css";

export function Providers({ children }) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());
  const wallets = useMemo(() => getSolanaWallets(), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectionProvider endpoint={SOLANA_ENDPOINT}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>{children}</WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
