import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GOV.AI — Unified Government Services",
  description:
    "AI Bureaucracy — a speculative design research prototype: a public service hall run entirely by AI agents, built to observe whether bureaucracy emerges from organizational structure.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
