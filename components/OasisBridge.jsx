"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import sdk from "@farcaster/frame-sdk";
import ConnectWallet from "./ConnectWallet";
import ConnectSolanaWallet from "./ConnectSolanaWallet";
import SignIn from "./SignIn";
import { getRelayClient } from "@/lib/relay";

// ─── Constants ───────────────────────────────────────────────────────────────
const SOLANA_CHAIN_ID = 792703809;
const BASE_CHAIN_ID = 8453;
const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";
const SOLANA_NATIVE = "11111111111111111111111111111111";
const RELAY_API = "https://api.relay.link";

const CHAINS = {
  [BASE_CHAIN_ID]: { name: "BASE", symbol: "ETH", icon: "◆", color: "#00f0ff", nativeAddress: NATIVE_ADDRESS, nativeDecimals: 18, nativeSymbol: "ETH", sector: "SECTOR-8453" },
  [SOLANA_CHAIN_ID]: { name: "SOLANA", symbol: "SOL", icon: "◎", color: "#ff00aa", nativeAddress: SOLANA_NATIVE, nativeDecimals: 9, nativeSymbol: "SOL", sector: "SECTOR-SOL" },
};

const TOKENS = {
  [BASE_CHAIN_ID]: [
    { symbol: "ETH", name: "Ether", address: NATIVE_ADDRESS, decimals: 18, logo: "◆" },
    { symbol: "USDC", name: "USD Coin", address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", decimals: 6, logo: "¢" },
    { symbol: "USDT", name: "Tether", address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", decimals: 6, logo: "₮" },
  ],
  [SOLANA_CHAIN_ID]: [
    { symbol: "SOL", name: "Solana", address: SOLANA_NATIVE, decimals: 9, logo: "◎" },
    { symbol: "USDC", name: "USD Coin", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, logo: "¢" },
  ],
};

function toBaseUnits(amount, decimals) {
  if (!amount || isNaN(Number(amount))) return "0";
  const [whole = "0", frac = ""] = amount.split(".");
  const paddedFrac = frac.padEnd(decimals, "0").slice(0, decimals);
  return (whole + paddedFrac).replace(/^0+/, "") || "0";
}

// ─── Glitch Text ─────────────────────────────────────────────────────────────
function GlitchText({ children, tag: Tag = "span", style = {} }) {
  return (
    <Tag data-text={children} style={{ position: "relative", display: "inline-block", ...style }} className="glitch-text">
      {children}
    </Tag>
  );
}

// ─── HUD Corner ──────────────────────────────────────────────────────────────
function HudCorner({ position = "tl" }) {
  const corners = {
    tl: { top: 0, left: 0, borderTop: "2px solid var(--neon-cyan)", borderLeft: "2px solid var(--neon-cyan)" },
    tr: { top: 0, right: 0, borderTop: "2px solid var(--neon-cyan)", borderRight: "2px solid var(--neon-cyan)" },
    bl: { bottom: 0, left: 0, borderBottom: "2px solid var(--neon-magenta)", borderLeft: "2px solid var(--neon-magenta)" },
    br: { bottom: 0, right: 0, borderBottom: "2px solid var(--neon-magenta)", borderRight: "2px solid var(--neon-magenta)" },
  };
  return <div style={{ position: "absolute", width: 14, height: 14, ...corners[position], opacity: 0.7 }} />;
}

// ─── Holo Panel ──────────────────────────────────────────────────────────────
function HoloPanel({ children, glow = "cyan", style = {} }) {
  const glowColor = glow === "magenta" ? "var(--neon-magenta)" : "var(--neon-cyan)";
  return (
    <div style={{
      position: "relative",
      background: "linear-gradient(180deg, rgba(0,240,255,0.04) 0%, rgba(255,0,170,0.02) 100%)",
      border: `1px solid ${glowColor}30`,
      borderRadius: 4, padding: "14px 16px",
      boxShadow: `inset 0 0 30px ${glowColor}08, 0 0 15px ${glowColor}10`,
      ...style,
    }}>
      <HudCorner position="tl" />
      <HudCorner position="tr" />
      <HudCorner position="bl" />
      <HudCorner position="br" />
      {children}
    </div>
  );
}

// ─── Scanline Overlay ────────────────────────────────────────────────────────
function Scanlines() {
  return <div style={{
    position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50,
    background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
    borderRadius: "inherit",
  }} />;
}

// ─── Status HUD ──────────────────────────────────────────────────────────────
function StatusHud({ status }) {
  const map = {
    idle: { label: "STANDING BY", color: "var(--neon-cyan)", blink: false },
    quoting: { label: "SCANNING ROUTES...", color: "var(--neon-yellow)", blink: true },
    quoted: { label: "ROUTE LOCKED", color: "var(--neon-green)", blink: false },
    bridging: { label: "TELEPORTING...", color: "var(--neon-magenta)", blink: true },
    success: { label: "TRANSFER COMPLETE", color: "var(--neon-green)", blink: false },
    error: { label: "SYSTEM ERROR", color: "var(--neon-red)", blink: true },
  };
  const s = map[status] || map.idle;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      fontFamily: "var(--font-hud)", fontSize: 11, letterSpacing: "0.15em",
      color: s.color, textShadow: `0 0 10px ${s.color}`,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: s.color,
        boxShadow: `0 0 8px ${s.color}`,
        animation: s.blink ? "blink 0.6s infinite" : "none",
      }} />
      {s.label}
    </div>
  );
}

// ─── Chain Portal ────────────────────────────────────────────────────────────
function ChainPortal({ chainId, label }) {
  const chain = CHAINS[chainId];
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      padding: "10px 14px", minWidth: 110,
    }}>
      <span style={{
        fontFamily: "var(--font-hud)", fontSize: 9, letterSpacing: "0.2em",
        color: "var(--neon-cyan)", opacity: 0.6, textTransform: "uppercase",
      }}>{label}</span>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        border: `2px solid ${chain.color}`,
        boxShadow: `0 0 20px ${chain.color}40, inset 0 0 15px ${chain.color}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, animation: "float 3s ease-in-out infinite",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          border: `1px solid ${chain.color}20`,
          animation: "spin 8s linear infinite",
        }} />
        {chain.icon}
      </div>
      <span style={{
        fontFamily: "var(--font-hud)", fontSize: 13, fontWeight: 700,
        color: chain.color, textShadow: `0 0 12px ${chain.color}80`,
        letterSpacing: "0.1em",
      }}>{chain.name}</span>
      <span style={{
        fontFamily: "var(--font-hud)", fontSize: 8, letterSpacing: "0.15em",
        color: "var(--neon-cyan)", opacity: 0.4,
      }}>{chain.sector}</span>
    </div>
  );
}

// ─── Token Selector ──────────────────────────────────────────────────────────
function TokenSelect({ chainId, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const tokens = TOKENS[chainId] || [];
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} className="oasis-btn" style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "rgba(0,240,255,0.06)", border: "1px solid var(--neon-cyan)30",
        borderRadius: 3, padding: "5px 10px", cursor: "pointer",
        fontFamily: "var(--font-hud)", fontSize: 13, fontWeight: 700,
        color: "var(--neon-cyan)", letterSpacing: "0.06em",
      }}>
        <span style={{ fontSize: 14 }}>{selected.logo}</span>
        {selected.symbol}
        <span style={{ fontSize: 8, opacity: 0.5 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, minWidth: 140,
          background: "rgba(5,8,18,0.97)", border: "1px solid var(--neon-cyan)40",
          borderRadius: 3, overflow: "hidden", zIndex: 20,
          boxShadow: "0 0 30px rgba(0,240,255,0.15)",
        }}>
          {tokens.map(t => (
            <button key={t.address} onClick={() => { onSelect(t); setOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "7px 10px", border: "none", cursor: "pointer",
              background: t.address === selected.address ? "rgba(0,240,255,0.1)" : "transparent",
              color: "var(--neon-cyan)", fontFamily: "var(--font-hud)", fontSize: 12,
              letterSpacing: "0.04em",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,240,255,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = t.address === selected.address ? "rgba(0,240,255,0.1)" : "transparent"}
            >
              <span>{t.logo}</span>
              <span style={{ fontWeight: 700 }}>{t.symbol}</span>
              <span style={{ fontSize: 9, opacity: 0.4, marginLeft: "auto" }}>{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Teleport Button (swap direction) ────────────────────────────────────────
function TeleportSwap({ onClick }) {
  return (
    <button onClick={onClick} title="Reverse teleport" style={{
      width: 42, height: 42, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(255,0,170,0.2) 0%, transparent 70%)",
      border: "2px solid var(--neon-magenta)",
      boxShadow: "0 0 20px rgba(255,0,170,0.3), inset 0 0 10px rgba(255,0,170,0.15)",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-hud)", fontSize: 16, color: "var(--neon-magenta)",
      transition: "all 0.3s",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 35px rgba(255,0,170,0.6), inset 0 0 15px rgba(255,0,170,0.3)"; e.currentTarget.style.transform = "rotate(180deg)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(255,0,170,0.3), inset 0 0 10px rgba(255,0,170,0.15)"; e.currentTarget.style.transform = "rotate(0)"; }}
    >
      ⇌
    </button>
  );
}

// ─── Quote Data Display ──────────────────────────────────────────────────────
function QuoteData({ quote }) {
  if (!quote?.details) return null;
  const { details, fees } = quote;
  const rows = [
    ["OUTPUT", details.currencyOut?.amountFormatted ? `${Number(details.currencyOut.amountFormatted).toFixed(6)} ${details.currencyOut.currency?.symbol}` : "—", "var(--neon-green)"],
    ["RATE", details.rate ? `1 : ${Number(details.rate).toFixed(6)}` : "—", "var(--neon-cyan)"],
    ["ETA", details.timeEstimate ? `${details.timeEstimate}s` : "—", "var(--neon-cyan)"],
    ["FEE", fees?.gas?.amountUsd ? `$${Number(fees.gas.amountUsd).toFixed(2)}` : "—", "var(--neon-yellow)"],
    ["IMPACT", details.totalImpact?.percent ? `${details.totalImpact.percent}%` : "—", Number(details.totalImpact?.percent) > 1 ? "var(--neon-red)" : "var(--neon-cyan)"],
  ];
  return (
    <HoloPanel glow="cyan" style={{ padding: "10px 14px" }}>
      <div style={{ fontFamily: "var(--font-hud)", fontSize: 9, letterSpacing: "0.2em", color: "var(--neon-cyan)", opacity: 0.5, marginBottom: 8 }}>
        ─── ROUTE TELEMETRY ───
      </div>
      {rows.map(([label, val, color]) => (
        <div key={label} style={{
          display: "flex", justifyContent: "space-between", padding: "3px 0",
          fontFamily: "var(--font-hud)", fontSize: 11,
        }}>
          <span style={{ color: "var(--neon-cyan)", opacity: 0.5, letterSpacing: "0.12em" }}>{label}</span>
          <span style={{ color, textShadow: `0 0 8px ${color}60`, fontWeight: 600 }}>{val}</span>
        </div>
      ))}
    </HoloPanel>
  );
}

// ─── Steps as Mission Objectives ─────────────────────────────────────────────
function MissionSteps({ steps }) {
  if (!steps?.length) return null;
  return (
    <HoloPanel glow="magenta" style={{ padding: "10px 14px" }}>
      <div style={{ fontFamily: "var(--font-hud)", fontSize: 9, letterSpacing: "0.2em", color: "var(--neon-magenta)", opacity: 0.6, marginBottom: 8 }}>
        ─── MISSION OBJECTIVES ───
      </div>
      {steps.map((step, i) => (
        <div key={step.id || i} style={{
          display: "flex", alignItems: "flex-start", gap: 10, padding: "5px 0",
          borderTop: i > 0 ? "1px solid rgba(255,0,170,0.1)" : "none",
        }}>
          <span style={{
            fontFamily: "var(--font-hud)", fontSize: 10, fontWeight: 700,
            color: "var(--neon-magenta)", textShadow: "0 0 8px rgba(255,0,170,0.5)",
            minWidth: 20,
          }}>[{String(i + 1).padStart(2, "0")}]</span>
          <div>
            <div style={{ fontFamily: "var(--font-hud)", fontSize: 11, color: "var(--neon-cyan)", fontWeight: 600 }}>{step.action}</div>
            <div style={{ fontFamily: "var(--font-hud)", fontSize: 10, color: "var(--neon-cyan)", opacity: 0.4 }}>{step.description}</div>
          </div>
        </div>
      ))}
    </HoloPanel>
  );
}

// ─── History Log ─────────────────────────────────────────────────────────────
function HistoryLog({ history }) {
  if (!history.length) return (
    <div style={{ textAlign: "center", padding: "50px 0", fontFamily: "var(--font-hud)", fontSize: 12, color: "var(--neon-cyan)", opacity: 0.3, letterSpacing: "0.15em" }}>
      NO TELEPORT LOGS RECORDED
    </div>
  );
  return history.map(h => (
    <div key={h.id} style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 12px", borderBottom: "1px solid rgba(0,240,255,0.06)",
      fontFamily: "var(--font-hud)", fontSize: 11,
    }}>
      <div>
        <div style={{ color: "var(--neon-cyan)", fontWeight: 600, letterSpacing: "0.05em" }}>{h.from} → {h.to}</div>
        <div style={{ color: "var(--neon-cyan)", opacity: 0.35, fontSize: 10 }}>{h.amount} → {h.out}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ color: h.status === "done" ? "var(--neon-green)" : "var(--neon-yellow)", fontWeight: 700, fontSize: 10, letterSpacing: "0.1em" }}>
          {h.status === "done" ? "✓ ARRIVED" : "◌ IN TRANSIT"}
        </div>
        <div style={{ fontSize: 9, color: "var(--neon-cyan)", opacity: 0.3 }}>{h.time}</div>
      </div>
    </div>
  ));
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function OasisBridge() {
  // EVM wallet (wagmi)
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Solana wallet
  const { publicKey: solanaPublicKey, connected: solanaConnected, sendTransaction: solanaSendTransaction } = useWallet();
  const { connection: solanaConnection } = useConnection();

  const [fromChain, setFromChain] = useState(SOLANA_CHAIN_ID);
  const [toChain, setToChain] = useState(BASE_CHAIN_ID);
  const [fromToken, setFromToken] = useState(TOKENS[SOLANA_CHAIN_ID][0]);
  const [toToken, setToToken] = useState(TOKENS[BASE_CHAIN_ID][0]);
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [quote, setQuote] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("bridge");
  const [history, setHistory] = useState([]);
  const [bridgeProgress, setBridgeProgress] = useState("");
  const quoteTimer = useRef(null);
  const [time, setTime] = useState(new Date());

  // Dynamic wallet address based on origin chain
  const isSolanaOrigin = fromChain === SOLANA_CHAIN_ID;
  const walletAddress = isSolanaOrigin
    ? (solanaPublicKey?.toBase58() || "")
    : (evmAddress || "");
  const isOriginConnected = isSolanaOrigin ? solanaConnected : evmConnected;

  // Auto-fill recipient from the opposite chain's wallet
  const autoRecipient = isSolanaOrigin
    ? (evmAddress || "")
    : (solanaPublicKey?.toBase58() || "");

  // Signal Base App to hide splash screen
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSwap = useCallback(() => {
    setFromChain(toChain); setToChain(fromChain);
    setFromToken(TOKENS[toChain][0]); setToToken(TOKENS[fromChain][0]);
    setQuote(null); setError(""); setStatus("idle");
  }, [fromChain, toChain]);

  useEffect(() => { setFromToken(TOKENS[fromChain][0]); }, [fromChain]);
  useEffect(() => { setToToken(TOKENS[toChain][0]); }, [toChain]);

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    if (!amount || Number(amount) <= 0 || !walletAddress) { setQuote(null); setStatus("idle"); return; }
    quoteTimer.current = setTimeout(() => fetchQuote(), 800);
    return () => clearTimeout(quoteTimer.current);
  }, [amount, fromChain, toChain, fromToken, toToken, walletAddress]);

  const fetchQuote = async () => {
    setStatus("quoting"); setError(""); setQuote(null);
    try {
      const body = {
        user: walletAddress, originChainId: fromChain, destinationChainId: toChain,
        originCurrency: fromToken.address, destinationCurrency: toToken.address,
        amount: toBaseUnits(amount, fromToken.decimals), tradeType: "EXACT_INPUT",
      };
      // Use custom recipient, or auto-fill from opposite chain wallet
      const recipient = recipientAddress || autoRecipient;
      if (recipient) body.recipient = recipient;
      const res = await fetch(`${RELAY_API}/quote/v2`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || `ERR ${res.status}`); }
      const data = await res.json();
      setQuote(data); setStatus("quoted");
    } catch (e) { setError(e.message); setStatus("error"); }
  };

  const handleBridge = async () => {
    if (!quote?.steps?.length) return;
    setStatus("bridging");
    setError("");
    setBridgeProgress("Initiating teleport...");

    const entry = {
      id: Date.now(), from: CHAINS[fromChain].name, to: CHAINS[toChain].name,
      amount: `${amount} ${fromToken.symbol}`,
      out: quote.details?.currencyOut?.amountFormatted ? `${Number(quote.details.currencyOut.amountFormatted).toFixed(6)} ${quote.details.currencyOut.currency?.symbol}` : "—",
      time: new Date().toLocaleTimeString(), status: "pending",
    };
    setHistory(h => [entry, ...h]);

    try {
      if (!isSolanaOrigin && walletClient) {
        // ── EVM origin (Base → Solana): use Relay SDK execute ──
        const relayClient = getRelayClient();
        await relayClient.actions.execute(quote, walletClient, {
          onProgress: (state) => {
            if (state.currentStep) {
              setBridgeProgress(`Step: ${state.currentStep.action || state.currentStep.id || "processing"}...`);
            }
            if (state.txHashes?.length) {
              setBridgeProgress(`TX submitted: ${state.txHashes[state.txHashes.length - 1].slice(0, 10)}...`);
            }
          },
        });
      } else {
        // ── Solana origin (Solana → Base): manual step execution ──
        for (let i = 0; i < quote.steps.length; i++) {
          const step = quote.steps[i];
          setBridgeProgress(`Step ${i + 1}/${quote.steps.length}: ${step.action || step.id || "processing"}...`);

          if (!step.items) continue;
          for (const item of step.items) {
            if (item.data?.data) {
              // Deserialize and send Solana transaction
              const txBytes = Buffer.from(item.data.data, "base64");
              const tx = VersionedTransaction.deserialize(txBytes);
              const signature = await solanaSendTransaction(tx, solanaConnection);
              setBridgeProgress(`TX sent: ${signature.slice(0, 10)}...`);

              // Confirm transaction
              await solanaConnection.confirmTransaction(signature, "confirmed");
              setBridgeProgress(`TX confirmed: ${signature.slice(0, 10)}...`);
            }
          }

          // Poll Relay for cross-chain completion if check endpoint exists
          if (step.check?.endpoint) {
            setBridgeProgress("Waiting for cross-chain confirmation...");
            let attempts = 0;
            while (attempts < 60) {
              const checkRes = await fetch(`${RELAY_API}${step.check.endpoint}`);
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.status === "success" || checkData.status === "confirmed") break;
                if (checkData.status === "failed") throw new Error("Bridge transaction failed on destination chain");
              }
              await new Promise(r => setTimeout(r, 3000));
              attempts++;
            }
            if (attempts >= 60) throw new Error("Bridge confirmation timeout");
          }
        }
      }

      setStatus("success");
      setBridgeProgress("");
      setHistory(h => h.map(x => x.id === entry.id ? { ...x, status: "done" } : x));
    } catch (e) {
      setError(e.shortMessage || e.message || "Transaction failed");
      setStatus("error");
      setBridgeProgress("");
      setHistory(h => h.map(x => x.id === entry.id ? { ...x, status: "failed" } : x));
    }
  };

  const canQuote = amount && Number(amount) > 0 && walletAddress;
  const canBridge = status === "quoted" && quote?.steps?.length > 0 && isOriginConnected;

  return (
    <div style={{
      "--neon-cyan": "#00f0ff",
      "--neon-magenta": "#ff00aa",
      "--neon-green": "#39ff14",
      "--neon-yellow": "#ffe600",
      "--neon-red": "#ff2040",
      "--bg-deep": "#05080f",
      "--bg-panel": "rgba(5,15,30,0.85)",
      "--font-hud": "'Share Tech Mono', 'Courier New', monospace",
      fontFamily: "var(--font-hud)",
      minHeight: "100vh",
      background: "var(--bg-deep)",
      color: "var(--neon-cyan)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 20, position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes grid-scroll { from{transform:perspective(400px) rotateX(60deg) translateY(0)} to{transform:perspective(400px) rotateX(60deg) translateY(40px)} }
        @keyframes flicker { 0%,95%,100%{opacity:1} 96%{opacity:0.7} 97%{opacity:1} 98%{opacity:0.4} }
        @keyframes scanmove { from{top:-4px} to{top:100%} }
        @keyframes glitch-anim {
          0%{clip-path:inset(40% 0 61% 0);transform:translate(-2px,0)} 20%{clip-path:inset(92% 0 1% 0);transform:translate(2px,0)}
          40%{clip-path:inset(43% 0 1% 0);transform:translate(-1px,0)} 60%{clip-path:inset(25% 0 58% 0);transform:translate(1px,0)}
          80%{clip-path:inset(54% 0 7% 0);transform:translate(-1px,0)} 100%{clip-path:inset(58% 0 43% 0);transform:translate(0)}
        }
        .glitch-text::before, .glitch-text::after {
          content: attr(data-text); position:absolute; top:0; left:0; width:100%; height:100%;
        }
        .glitch-text::before { color:var(--neon-magenta); animation:glitch-anim 3s infinite linear alternate-reverse; z-index:-1; }
        .glitch-text::after { color:var(--neon-cyan); animation:glitch-anim 2s infinite linear alternate; z-index:-1; }
        .oasis-input { background:rgba(0,240,255,0.04) !important; border:1px solid rgba(0,240,255,0.15) !important; border-radius:3px !important; color:var(--neon-cyan) !important; font-family:var(--font-hud) !important; }
        .oasis-input:focus { outline:none !important; border-color:var(--neon-cyan) !important; box-shadow:0 0 12px rgba(0,240,255,0.2) !important; }
        .oasis-input::placeholder { color:rgba(0,240,255,0.2); }
        * { box-sizing:border-box; }
        button:active { transform:scale(0.96); }
      `}</style>

      {/* Background grid */}
      <div style={{
        position: "fixed", bottom: -40, left: "-10%", right: "-10%", height: 200,
        background: `repeating-linear-gradient(90deg, transparent, transparent 38px, rgba(0,240,255,0.06) 38px, rgba(0,240,255,0.06) 40px),
                     repeating-linear-gradient(0deg, transparent, transparent 38px, rgba(0,240,255,0.06) 38px, rgba(0,240,255,0.06) 40px)`,
        animation: "grid-scroll 4s linear infinite",
        opacity: 0.4, pointerEvents: "none", zIndex: 0,
      }} />

      {/* Floating orbs */}
      <div style={{ position: "fixed", top: "15%", left: "8%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,0,170,0.08) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none", animation: "float 6s ease-in-out infinite" }} />
      <div style={{ position: "fixed", bottom: "20%", right: "10%", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,240,255,0.06) 0%, transparent 70%)", filter: "blur(50px)", pointerEvents: "none", animation: "float 8s ease-in-out infinite reverse" }} />

      {/* Top HUD bar */}
      <div style={{
        width: "100%", maxWidth: 440, display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10, padding: "0 4px", zIndex: 1,
      }}>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", opacity: 0.35 }}>
          OASIS://BRIDGE.RELAY.LINK
        </div>
        <div style={{ fontSize: 9, letterSpacing: "0.15em", opacity: 0.35, fontVariantNumeric: "tabular-nums" }}>
          {time.toLocaleTimeString()} UTC
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 14, zIndex: 1 }}>
        <GlitchText tag="div" style={{
          fontFamily: "'Orbitron', sans-serif", fontSize: 26, fontWeight: 900,
          letterSpacing: "0.08em", lineHeight: 1.1,
          textShadow: "0 0 20px rgba(0,240,255,0.5), 0 0 40px rgba(255,0,170,0.3)",
        }}>
          OASIS BRIDGE
        </GlitchText>
        <div style={{ fontSize: 9, letterSpacing: "0.3em", opacity: 0.4, marginTop: 4, color: "var(--neon-magenta)" }}>
          ◈ CROSS-CHAIN TELEPORTER ◈ POWERED BY RELAY
        </div>
      </div>

      {/* Wallet Connect (dual: EVM + Solana) */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        marginBottom: 12, zIndex: 1,
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <ConnectWallet />
          <ConnectSolanaWallet />
        </div>
        {evmConnected && <SignIn />}
      </div>

      {/* Status */}
      <div style={{ marginBottom: 12, zIndex: 1 }}>
        <StatusHud status={status} />
      </div>

      {/* Tab Switcher */}
      <div style={{
        width: "100%", maxWidth: 440, display: "flex", gap: 0, marginBottom: 2, zIndex: 1,
      }}>
        {[["bridge", "◇ TELEPORT"], ["history", "◇ LOG"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: "8px 0", border: "1px solid rgba(0,240,255,0.15)",
            borderBottom: tab === key ? "2px solid var(--neon-cyan)" : "1px solid rgba(0,240,255,0.15)",
            background: tab === key ? "rgba(0,240,255,0.06)" : "transparent",
            color: tab === key ? "var(--neon-cyan)" : "rgba(0,240,255,0.3)",
            fontFamily: "var(--font-hud)", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.15em", cursor: "pointer",
            textShadow: tab === key ? "0 0 8px rgba(0,240,255,0.4)" : "none",
          }}>{label}</button>
        ))}
      </div>

      {/* Main Panel */}
      <div style={{
        width: "100%", maxWidth: 440, position: "relative",
        background: "var(--bg-panel)",
        border: "1px solid rgba(0,240,255,0.12)",
        borderTop: "none", padding: "18px 18px 20px",
        zIndex: 1, animation: "flicker 10s infinite",
        boxShadow: "0 0 60px rgba(0,240,255,0.04), inset 0 0 40px rgba(0,0,0,0.3)",
      }}>
        <Scanlines />

        {tab === "bridge" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 1 }}>

            {/* Wallet Status */}
            {!isOriginConnected && (
              <div style={{
                textAlign: "center", padding: "20px", fontSize: 11,
                color: "var(--neon-yellow)", letterSpacing: "0.08em",
                opacity: 0.6,
              }}>
                ⚠ CONNECT {isSolanaOrigin ? "SOLANA" : "EVM"} WALLET TO BEGIN TELEPORTATION
              </div>
            )}

            {isOriginConnected && (
              <>
                {/* Connected wallet display */}
                <div style={{
                  fontSize: 9, letterSpacing: "0.15em", opacity: 0.5,
                  textAlign: "center",
                }}>
                  PILOT: {walletAddress}
                  {autoRecipient && (
                    <span style={{ display: "block", marginTop: 2, opacity: 0.4 }}>
                      RECIPIENT: {autoRecipient}
                    </span>
                  )}
                </div>

                {/* Chain Portals */}
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
                  <ChainPortal chainId={fromChain} label="ORIGIN" />
                  <TeleportSwap onClick={handleSwap} />
                  <ChainPortal chainId={toChain} label="DESTINATION" />
                </div>

                {/* Amount */}
                <HoloPanel glow="cyan">
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", opacity: 0.4, marginBottom: 8 }}>PAYLOAD AMOUNT</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      className="oasis-input"
                      type="text" inputMode="decimal" placeholder="0.0"
                      value={amount}
                      onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ""); if ((v.match(/\./g) || []).length <= 1) setAmount(v); }}
                      style={{
                        flex: 1, background: "transparent !important", border: "none !important",
                        fontSize: 28, fontWeight: 700, padding: 0,
                        fontFamily: "'Orbitron', sans-serif", color: "var(--neon-cyan)",
                        textShadow: "0 0 15px rgba(0,240,255,0.4)",
                      }}
                    />
                    <TokenSelect chainId={fromChain} selected={fromToken} onSelect={setFromToken} />
                  </div>
                </HoloPanel>

                {/* Receive */}
                <HoloPanel glow="magenta">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 9, letterSpacing: "0.2em", opacity: 0.4 }}>RECEIVING</span>
                    <TokenSelect chainId={toChain} selected={toToken} onSelect={setToToken} />
                  </div>
                  {quote?.details?.currencyOut && (
                    <div style={{
                      fontFamily: "'Orbitron', sans-serif", fontSize: 24, fontWeight: 700,
                      marginTop: 8, color: "var(--neon-green)",
                      textShadow: "0 0 15px rgba(57,255,20,0.4)",
                    }}>
                      ~{Number(quote.details.currencyOut.amountFormatted).toFixed(6)}
                    </div>
                  )}
                </HoloPanel>

                {/* Custom recipient */}
                <details style={{ cursor: "pointer" }}>
                  <summary style={{ fontSize: 10, letterSpacing: "0.1em", opacity: 0.35, fontFamily: "var(--font-hud)" }}>
                    ▸ CUSTOM DESTINATION WALLET
                  </summary>
                  <input
                    className="oasis-input"
                    type="text"
                    placeholder={toChain === BASE_CHAIN_ID ? "0x recipient on Base" : "Solana recipient"}
                    value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", fontSize: 11, marginTop: 6 }}
                  />
                </details>

                {/* Quote & Steps */}
                {quote && <QuoteData quote={quote} />}
                {quote?.steps && <MissionSteps steps={quote.steps} />}

                {/* Error */}
                {error && (
                  <div style={{
                    background: "rgba(255,32,64,0.08)", border: "1px solid rgba(255,32,64,0.3)",
                    borderRadius: 3, padding: "8px 12px", fontSize: 11,
                    color: "var(--neon-red)", textShadow: "0 0 8px rgba(255,32,64,0.4)",
                    letterSpacing: "0.04em",
                  }}>
                    ⚠ SYSTEM ERROR: {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  {status !== "quoted" && (
                    <button onClick={fetchQuote} disabled={!canQuote || status === "quoting"} style={{
                      flex: 1, padding: "13px 0", border: `1px solid ${canQuote ? "var(--neon-cyan)" : "rgba(0,240,255,0.15)"}`,
                      borderRadius: 3, background: canQuote ? "rgba(0,240,255,0.08)" : "transparent",
                      color: canQuote ? "var(--neon-cyan)" : "rgba(0,240,255,0.2)",
                      fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700,
                      letterSpacing: "0.12em", cursor: canQuote ? "pointer" : "not-allowed",
                      textShadow: canQuote ? "0 0 10px rgba(0,240,255,0.4)" : "none",
                      boxShadow: canQuote ? "0 0 15px rgba(0,240,255,0.15)" : "none",
                      transition: "all 0.2s",
                    }}>
                      {status === "quoting" ? "SCANNING..." : "SCAN ROUTE"}
                    </button>
                  )}
                  {canBridge && (
                    <button onClick={handleBridge} style={{
                      flex: 1, padding: "13px 0",
                      border: "1px solid var(--neon-magenta)",
                      borderRadius: 3,
                      background: "linear-gradient(135deg, rgba(255,0,170,0.15) 0%, rgba(0,240,255,0.1) 100%)",
                      color: "#fff", fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700,
                      letterSpacing: "0.12em", cursor: "pointer",
                      textShadow: "0 0 10px rgba(255,0,170,0.5), 0 0 20px rgba(0,240,255,0.3)",
                      boxShadow: "0 0 25px rgba(255,0,170,0.2), 0 0 50px rgba(0,240,255,0.1)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 40px rgba(255,0,170,0.4), 0 0 80px rgba(0,240,255,0.2)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 25px rgba(255,0,170,0.2), 0 0 50px rgba(0,240,255,0.1)"}
                    >
                      ⚡ TELEPORT
                    </button>
                  )}
                </div>

                {/* Bridge Progress */}
                {status === "bridging" && bridgeProgress && (
                  <div style={{
                    textAlign: "center", padding: "10px", fontSize: 10,
                    color: "var(--neon-magenta)", background: "rgba(255,0,170,0.06)",
                    border: "1px solid rgba(255,0,170,0.2)", borderRadius: 3,
                    textShadow: "0 0 8px rgba(255,0,170,0.3)", letterSpacing: "0.06em",
                    animation: "blink 1.5s infinite",
                  }}>
                    ◌ {bridgeProgress}
                  </div>
                )}

                {status === "success" && (
                  <div style={{
                    textAlign: "center", padding: "12px", fontSize: 11,
                    color: "var(--neon-green)", background: "rgba(57,255,20,0.06)",
                    border: "1px solid rgba(57,255,20,0.2)", borderRadius: 3,
                    textShadow: "0 0 10px rgba(57,255,20,0.4)", letterSpacing: "0.08em",
                  }}>
                    ✓ TELEPORT COMPLETE — ASSETS BRIDGED SUCCESSFULLY
                  </div>
                )}
              </>
            )}

            {/* Footer stats */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 8, opacity: 0.25, letterSpacing: "0.12em", padding: "0 2px",
            }}>
              <span>SOL-ID: {SOLANA_CHAIN_ID}</span>
              <span>BASE-ID: {BASE_CHAIN_ID}</span>
              <span>API: RELAY v2</span>
            </div>
          </div>
        ) : (
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", opacity: 0.4, marginBottom: 10 }}>
              ─── TELEPORT LOG ───
            </div>
            <HistoryLog history={history} />
          </div>
        )}
      </div>

      {/* Bottom HUD */}
      <div style={{
        width: "100%", maxWidth: 440, display: "flex", justifyContent: "center",
        marginTop: 14, zIndex: 1,
      }}>
        <div style={{
          fontSize: 8, letterSpacing: "0.2em", opacity: 0.25,
          textAlign: "center", lineHeight: 1.8,
        }}>
          ◈ OASIS BRIDGE v1.0 ◈<br />
          RELAY PROTOCOL · SOLANA ↔ BASE · BASE MINI APP
        </div>
      </div>
    </div>
  );
}
