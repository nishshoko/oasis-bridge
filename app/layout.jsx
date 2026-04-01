import { Providers } from "./providers";

export const metadata = {
  title: "OASIS Bridge — Pocket Teleporter",
  description:
    "Cross-chain bridge Solana ↔ Base powered by Relay Protocol. Teleport assets instantly between chains.",
  openGraph: {
    title: "OASIS Bridge — Pocket Teleporter",
    description: "Teleport assets between Solana and Base with the OASIS Bridge",
    url: "https://oasis-bridge-two.vercel.app",
    siteName: "OASIS Bridge",
    type: "website",
  },
  other: {
    "base:app_id": "69cd187b2608b1800e5d5316",
    "base:builder-code": "",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#05080f",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#05080f" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
