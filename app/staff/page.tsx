"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AGENTS } from "@/lib/agents";
import { clearExperience, emptyExperience, loadExperience } from "@/lib/experience";
import { getLang, storeLang, t, type Lang } from "@/lib/i18n";
import type { ExperienceState } from "@/lib/types";

export default function StaffPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [exp, setExp] = useState<ExperienceState | null>(null);

  useEffect(() => {
    setLang(getLang());
    setExp(loadExperience());
  }, []);

  function toggleLang() {
    const next: Lang = lang === "en" ? "zh" : "en";
    setLang(next);
    storeLang(next);
  }

  function reset() {
    if (!window.confirm(t(lang, "resetExpConfirm"))) return;
    clearExperience();
    setExp(emptyExperience());
  }

  if (!exp) return null;

  const daysOnRecord = exp.casesLogged.length;

  return (
    <main>
      <header className="gov-header">
        <div className="gov-header-inner">
          <a className="gov-logotype" href="/">
            {t(lang, "brand")}
          </a>
          <span className="svc">{t(lang, "staffRecords")}</span>
          <span className="right">
            <button onClick={() => router.push("/")}>{t(lang, "brandSub")}</button>
            <button onClick={toggleLang}>{t(lang, "langToggle")}</button>
          </span>
        </div>
      </header>
      <div className="blue-bar" />

      <div className="page" style={{ maxWidth: 860 }}>
        <h1 className="h-xl" style={{ fontSize: 32 }}>
          {t(lang, "staffRecords")}
        </h1>
        <p className="lede" style={{ fontSize: 16 }}>
          {t(lang, "staffRecordsDesc")}
        </p>
        <div className="inset">
          {t(lang, "daysOnRecord")}: {daysOnRecord}
        </div>

        {daysOnRecord === 0 && <p style={{ color: "var(--ink-2)" }}>{t(lang, "expEmpty")}</p>}

        {AGENTS.map((a) => {
          const tally = exp.tallies[a.id];
          const notes = exp.notes[a.id] ?? [];
          if (!tally && notes.length === 0) return null;
          return (
            <section key={a.id} style={{ marginBottom: 28 }}>
              <h2 className="h-l" style={{ marginBottom: 6 }}>
                {a.windowNo ? `${a.windowNo} · ` : ""}
                {a.dept} — {a.personName}
                {a.status ? ` (${a.status})` : ""}
              </h2>
              {tally && (
                <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 8 }}>
                  cases {tally.cases} · replies {tally.exchanges} · memos in {tally.memosIn} /
                  out {tally.memosOut} · documents {tally.docs} · escalations{" "}
                  {tally.escalations} · tasks received {tally.assignmentsReceived}
                </p>
              )}
              {notes.length > 0 && (
                <div className="timeline" style={{ maxHeight: "none" }}>
                  {notes.map((n, i) => (
                    <div key={i} className="timeline-item" style={{ fontStyle: "italic" }}>
                      (“{n.matter}”) {n.text}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        <div className="report-actions">
          <button className="btn-warn" onClick={reset}>
            {t(lang, "resetExp")}
          </button>
        </div>
      </div>
    </main>
  );
}
