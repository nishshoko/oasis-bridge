"use client";

import { useState } from "react";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { useAccount, usePublicClient, useSignMessage } from "wagmi";

export default function SignIn({ onSuccess }) {
  const { address, chainId, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    if (!isConnected || !address || !chainId || !publicClient) return;

    setIsSigningIn(true);
    setError("");

    try {
      const nonce = generateSiweNonce();
      const message = createSiweMessage({
        address,
        chainId,
        domain: window.location.host,
        nonce,
        uri: window.location.origin,
        version: "1",
        statement: "Sign in to OASIS Bridge",
      });

      const signature = await signMessageAsync({ message });
      const valid = await publicClient.verifySiweMessage({ message, signature });

      if (!valid) throw new Error("SIWE verification failed");

      setVerified(true);
      onSuccess?.({ address, chainId });
    } catch (e) {
      setError(e.shortMessage || e.message || "Sign-in failed");
    } finally {
      setIsSigningIn(false);
    }
  }

  if (!isConnected) return null;

  if (verified) {
    return (
      <div
        style={{
          fontFamily: "var(--font-hud)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--neon-green)",
          textShadow: "0 0 8px rgba(57,255,20,0.4)",
        }}
      >
        ✓ IDENTITY VERIFIED
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <button
        onClick={handleSignIn}
        disabled={isSigningIn}
        style={{
          background: "rgba(255,0,170,0.08)",
          border: "1px solid rgba(255,0,170,0.5)",
          borderRadius: 3,
          padding: "6px 14px",
          fontFamily: "var(--font-hud)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--neon-magenta)",
          cursor: isSigningIn ? "wait" : "pointer",
          textShadow: "0 0 8px rgba(255,0,170,0.3)",
          transition: "all 0.2s",
          opacity: isSigningIn ? 0.6 : 1,
        }}
      >
        {isSigningIn ? "VERIFYING..." : "VERIFY IDENTITY (SIWE)"}
      </button>
      {error && (
        <div
          style={{
            fontFamily: "var(--font-hud)",
            fontSize: 9,
            color: "var(--neon-red)",
            letterSpacing: "0.05em",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
