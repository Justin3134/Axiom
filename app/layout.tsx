import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Axiom — Autonomous Research Platform",
  description:
    "The first AI research platform where agents don't reset. Each hypothesis gets a Blaxel sandbox that lives for months. Wordware synthesizes findings across the entire swarm.",
  keywords: [
    "AI research",
    "autonomous agents",
    "drug discovery",
    "scientific AI",
    "Blaxel",
    "Wordware",
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
