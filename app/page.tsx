"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WINDOW_AGENTS } from "@/lib/agents";
import { makeCaseId } from "@/lib/case-file";
import { loadCase, saveCase, clearCase } from "@/lib/storage";
import { archiveCase } from "@/lib/archive";
import { SCENARIOS } from "@/lib/visitors";
import { CONDITIONS } from "@/lib/conditions";
import { getLang, storeLang, t, type Lang } from "@/lib/i18n";
import { REPLAYS } from "@/lib/replays";

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
  const [conditionId, setConditionId] = useState("calm");

  useEffect(() => setLang(getLang()), []);

  function toggleLang() {
    const next: Lang = lang === "en" ? "zh" : "en";
    setLang(next);
    storeLang(next);
  }

  function stashCurrent() {
    const existing = loadCase();
    if (existing && existing.events.length > 0) archiveCase(existing);
  }

  function start() {
    const m = matter.trim();
    if (!m) return;
    stashCurrent();
    clearCase();
    saveCase({
      caseId: makeCaseId(),
      matter: m,
      startedAt: Date.now(),
      events: [],
      closed: false,
      conditionId,
    });
    router.push("/hall");
  }

  function startStress(scenarioId: string) {
    const s = SCENARIOS.find((x) => x.id === scenarioId);
    if (!s) return;
    stashCurrent();
    clearCase();
    saveCase({
      caseId: makeCaseId(),
      matter: s.matter,
      startedAt: Date.now(),
      events: [],
      closed: false,
      conditionId,
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
          <h3>Watch a replay</h3>
          <p>
            Recorded cases from the preregistered experiment runs, replayed in the hall —
            no live agents, no waiting.
          </p>
          <div className="row">
            {REPLAYS.map((r) => (
              <button
                key={r.id}
                className="btn-plain"
                title={`${r.blurb} (${r.stats})`}
                onClick={() => router.push(`/hall?mode=replay&id=${r.id}`)}
              >
                {r.title} ▸
              </button>
            ))}
          </div>
          <p style={{ marginTop: 14, marginBottom: 0 }}>
            <a href="/study">Read the study — how this hall was built and what it found →</a>
          </p>
        </section>

        <section className="stress-box">
          <h3>{t(lang, "conditionsTitle")}</h3>
          <p>{t(lang, "conditionsDesc")}</p>
          <div className="row">
            {CONDITIONS.map((c) => (
              <button
                key={c.id}
                className={"chip" + (conditionId === c.id ? " chip-on" : "")}
                onClick={() => setConditionId(c.id)}
                title={c.tagline}
              >
                {c.name}
              </button>
            ))}
          </div>
          <p style={{ marginTop: 14, marginBottom: 0 }}>
            <a href="/staff">{t(lang, "staffRecords")} →</a>
            {"　"}
            <a href="/cases">{t(lang, "caseArchive")} →</a>
          </p>
          <h3 style={{ marginTop: 18 }}>{t(lang, "stressTitle")}</h3>
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
