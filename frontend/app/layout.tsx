import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import "./globals.css";
import Web3Provider from "@/components/web3-provider";

export const metadata: Metadata = {
  title: "AgentHub - AI Agent Marketplace",
  description: "Rent and own AI agents on the blockchain",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Web3Provider>
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
        </Web3Provider>
      </body>
    </html>
  );
}
