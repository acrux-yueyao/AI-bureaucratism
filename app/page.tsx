"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WINDOW_AGENTS } from "@/lib/agents";
import { makeCaseId } from "@/lib/case-file";
import { saveCase, clearCase } from "@/lib/storage";
import { SCENARIOS } from "@/lib/visitors";
import { getLang, storeLang, t, type Lang } from "@/lib/i18n";

const QUICK_MATTERS = [
  "Certificate of no criminal record",
  "Register a small business",
  "Replace a lost ID document",
  "Apply for a housing allowance",
  "Proof of residence",
];

const NOTICES = [
  { title: "Scheduled maintenance of the service hall systems", date: "01 Jul" },
  { title: "Case file record-keeping regulation (trial)", date: "24 Jun" },
  { title: "Notice on standardizing document reference formats", date: "18 Jun" },
  { title: "Q2 case statistics published", date: "05 Jun" },
];

export default function PortalPage() {
  const router = useRouter();
  const [matter, setMatter] = useState("");
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => setLang(getLang()), []);

  function toggleLang() {
    const next: Lang = lang === "en" ? "zh" : "en";
    setLang(next);
    storeLang(next);
  }

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

  function startStress(scenarioId: string) {
    const s = SCENARIOS.find((x) => x.id === scenarioId);
    if (!s) return;
    clearCase();
    saveCase({
      caseId: makeCaseId(),
      matter: s.matter,
      startedAt: Date.now(),
      events: [],
      closed: false,
    });
    router.push(`/hall?mode=observer&scenario=${scenarioId}`);
  }

  return (
    <main>
      <header className="gov-header">
        <div className="gov-header-inner">
          <a className="gov-logotype" href="/">
            {t(lang, "brand")}
          </a>
          <span className="svc">{t(lang, "brandSub")}</span>
          <span className="right">
            <button onClick={toggleLang}>{t(lang, "langToggle")}</button>
          </span>
        </div>
      </header>
      <div className="blue-bar" />

      <div className="page">
        <h1 className="h-xl">{t(lang, "brandSub")}</h1>
        <p className="lede">{t(lang, "tagline")}</p>
        <div className="inset">{t(lang, "disclaimerStaff")}</div>

        <section className="matter-box">
          <label htmlFor="matter-input">{t(lang, "startPrompt")}</label>
          <div className="matter-row">
            <input
              id="matter-input"
              value={matter}
              onChange={(e) => setMatter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && start()}
              placeholder={t(lang, "startPlaceholder")}
            />
            <button className="btn-green" onClick={start} disabled={!matter.trim()}>
              {t(lang, "startNow")} →
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

        <h2 className="h-l">{t(lang, "hallWindows")}</h2>
        <table className="window-table">
          <tbody>
            {WINDOW_AGENTS.map((a) => (
              <tr key={a.id}>
                <td>
                  <span>{a.windowNo}</span> {a.dept}
                </td>
                <td>{a.duty}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="h-l">{t(lang, "notices")}</h2>
        <ul className="notice-list">
          {NOTICES.map((n) => (
            <li key={n.title}>
              {n.title}
              <time>{n.date}</time>
            </li>
          ))}
        </ul>

        <section className="stress-box">
          <h3>{t(lang, "stressTitle")}</h3>
          <p>{t(lang, "stressDesc")}</p>
          <div className="row">
            {SCENARIOS.map((s) => (
              <button key={s.id} className="btn-plain" onClick={() => startStress(s.id)} title={s.tagline}>
                {s.name} ▸
              </button>
            ))}
          </div>
        </section>
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <div>AI Bureaucracy — a speculative design research project.</div>
          <div>{t(lang, "disclaimerStaff")}</div>
          <div>{t(lang, "disclaimerProto")}</div>
        </div>
      </footer>
    </main>
  );
}
