"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

function truncateAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
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
          ● {truncateAddr(address)}
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
      onClick={() => {
        const connector = connectors[0];
        if (connector) connect({ connector });
      }}
      disabled={isPending}
      style={{
        background: "rgba(0,240,255,0.08)",
        border: "1px solid var(--neon-cyan)",
        borderRadius: 3,
        padding: "8px 18px",
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: "var(--neon-cyan)",
        cursor: isPending ? "wait" : "pointer",
        textShadow: "0 0 10px rgba(0,240,255,0.4)",
        boxShadow: "0 0 15px rgba(0,240,255,0.15)",
        transition: "all 0.2s",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {isPending ? "CONNECTING..." : "⚡ CONNECT WALLET"}
    </button>
  );
}
