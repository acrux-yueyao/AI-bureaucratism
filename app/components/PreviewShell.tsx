import Link from "next/link";
import type { ReactNode } from "react";
import { mockCaseId } from "@/lib/preview-data";

const navItems = [
  ["问题输入", "/service-terminal"],
  ["归属预检", "/apply/custom"],
  ["组织网络", `/case/${mockCaseId}/network`],
  ["文书档案", `/case/${mockCaseId}/document-request`],
  ["参与反馈", `/case/${mockCaseId}/feedback`],
  ["研究总结", `/case/${mockCaseId}/research`]
];

export function PreviewShell({
  title,
  meta,
  active,
  children
}: {
  title: string;
  meta: string;
  active: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="preview-topbar">
        <div className="preview-topbar-inner">
          <Link className="mark" href="/service-terminal">
            AI
          </Link>
          <div className="brand">
            <strong>AI 组织神经网络</strong>
            <span>Bureaucratic Neural Network / 智能行政后台观察室</span>
          </div>
          <div className="top-pills">
            <span className="pill">人工窗口：0</span>
            <span className="pill">全程留痕</span>
            <span className="pill">规则版本 07.06</span>
          </div>
        </div>
      </header>
      <main className="preview-frame">
        <section className="preview-window">
          <div className="window-head">
            <div className="window-title">▣ {title}</div>
            <div className="window-meta">{meta}</div>
          </div>
          <nav className="flow-nav" aria-label="预览页面导航">
            {navItems.map(([label, href]) => (
              <Link className={active === href ? "active" : ""} href={href} key={href}>
                {label}
              </Link>
            ))}
          </nav>
          {children}
        </section>
      </main>
    </>
  );
}
