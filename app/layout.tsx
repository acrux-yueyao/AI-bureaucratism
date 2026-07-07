import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Bureaucracy | 智能综合受理终端",
  description: "A speculative AI public-service terminal for observing bureaucratic behavior in autonomous organizations."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="terminal-shell">{children}</div>
      </body>
    </html>
  );
}
