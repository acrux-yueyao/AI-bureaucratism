"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AGENTS } from "@/lib/agents";
import { makeCaseId } from "@/lib/case-file";
import { saveCase, clearCase } from "@/lib/storage";

const QUICK_MATTERS = [
  "开具无犯罪记录证明",
  "办理个体工商户注册",
  "申请住房补贴",
  "补办遗失的证件",
  "开具居住证明",
  "咨询落户政策",
];

const NOTICES = [
  { title: "关于办事大厅系统例行升级的通知", date: "07-01" },
  { title: "本平台办件档案留痕管理办法（试行）", date: "06-24" },
  { title: "关于规范各窗口文书编号格式的通知", date: "06-18" },
  { title: "办事大厅第二季度办件情况公示", date: "06-05" },
];

const SERVICES = [
  { glyph: "◈", title: "个人办事", desc: "证明开具 · 资格申请" },
  { glyph: "◉", title: "法人办事", desc: "登记备案 · 资质审批" },
  { glyph: "◎", title: "部门服务", desc: "跨科室协同 · 内部函件" },
  { glyph: "◇", title: "阳光公示", desc: "办件档案 · 全程留痕" },
];

export default function PortalPage() {
  const router = useRouter();
  const [matter, setMatter] = useState("");

  function start() {
    const m = matter.trim();
    if (!m) return;
    clearCase();
    saveCase({
      caseId: makeCaseId(),
      matter: m,
      startedAt: Date.now(),
      events: [],
      closed: false,
    });
    router.push("/hall");
  }

  return (
    <main>
      <div className="topbar">
        <div className="topbar-inner">
          <div>
            <span>AI 政务服务门户</span>
            <span>本平台为思辨设计研究原型</span>
          </div>
          <div>
            <span>无障碍</span>
            <span>长者模式</span>
            <span>帮助中心</span>
          </div>
        </div>
      </div>

      <header className="banner">
        <div className="banner-inner">
          <div className="emblem">✦</div>
          <div>
            <h1>AI 一体化在线政务服务平台</h1>
            <p>智能办理 · 一网通办 · 全程留痕</p>
          </div>
        </div>
      </header>

      <div className="page">
        <section className="card matter-box">
          <label htmlFor="matter-input">我要办事</label>
          <div className="matter-row">
            <input
              id="matter-input"
              value={matter}
              onChange={(e) => setMatter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && start()}
              placeholder="请输入您要办理的事项，如：开具无犯罪记录证明"
            />
            <button className="btn-primary" onClick={start} disabled={!matter.trim()}>
              开始办理
            </button>
          </div>
          <div className="chips">
            {QUICK_MATTERS.map((q) => (
              <button key={q} className="chip" onClick={() => setMatter(q)}>
                {q}
              </button>
            ))}
          </div>
        </section>

        <h2 className="section-title">服务事项</h2>
        <div className="grid-4">
          {SERVICES.map((s) => (
            <div key={s.title} className="card service-card">
              <div className="glyph">{s.glyph}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ marginTop: 28 }}>
          <div>
            <h2 className="section-title" style={{ marginTop: 0 }}>
              通知公告
            </h2>
            <div className="card">
              <ul className="notice-list">
                {NOTICES.map((n) => (
                  <li key={n.title}>
                    {n.title}
                    <time>{n.date}</time>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h2 className="section-title" style={{ marginTop: 0 }}>
              办事大厅窗口
            </h2>
            <div className="card" style={{ padding: "4px 0" }}>
              {AGENTS.slice(0, 4).map((a) => (
                <div key={a.id} className="window-intro">
                  <span className="no">{a.windowNo}</span>
                  <div>
                    <h4>{a.dept}窗口</h4>
                    <p>{a.duty}</p>
                  </div>
                </div>
              ))}
              <div className="window-intro">
                <span className="no">…</span>
                <div>
                  <p>共 {AGENTS.length} 个窗口，全部由 AI 工作人员值守。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div>主办：AI Bureaucracy 思辨设计研究项目</div>
        <div>
          本平台所有窗口工作人员均为 AI Agent，仅被赋予组织身份与职责边界，未被指示任何行为方式。
        </div>
        <div>本平台非真实政务系统，不收集真实个人信息。</div>
      </footer>
    </main>
  );
}
