import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 一体化在线政务服务平台",
  description:
    "AI Bureaucracy —— 一个思辨设计研究原型：完全由 AI Agent 运行的政务服务大厅，用于观察官僚行为是否会从组织结构中涌现。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
