"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

function truncateAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

export default function ConnectSolanaWallet() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected && publicKey) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            fontFamily: "var(--font-hud)",
            fontSize: 11,
            letterSpacing: "0.1em",
            color: "var(--neon-green)",
            textShadow: "0 0 8px rgba(57,255,20,0.4)",
          }}
        >
          ◎ {truncateAddr(publicKey.toBase58())}
        </div>
        <button
          onClick={() => disconnect()}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,32,64,0.4)",
            borderRadius: 3,
            padding: "4px 10px",
            fontFamily: "var(--font-hud)",
            fontSize: 9,
            letterSpacing: "0.12em",
            color: "var(--neon-red)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          DISCONNECT
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      style={{
        background: "rgba(255,0,170,0.08)",
        border: "1px solid var(--neon-magenta)",
        borderRadius: 3,
        padding: "8px 18px",
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: "var(--neon-magenta)",
        cursor: "pointer",
        textShadow: "0 0 10px rgba(255,0,170,0.4)",
        boxShadow: "0 0 15px rgba(255,0,170,0.15)",
        transition: "all 0.2s",
      }}
    >
      ◎ CONNECT SOLANA
    </button>
  );
}
