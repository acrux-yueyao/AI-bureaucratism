"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { computeStats } from "@/lib/case-file";
import { loadArchive } from "@/lib/archive";
import { CONDITION_MAP } from "@/lib/conditions";
import { getLang, storeLang, t, type Lang } from "@/lib/i18n";
import type { ArchivedCase } from "@/lib/types";

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CasesPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [list, setList] = useState<ArchivedCase[]>([]);

  useEffect(() => {
    setLang(getLang());
    setList([...loadArchive()].sort((a, b) => b.archivedAt - a.archivedAt));
  }, []);

  function toggleLang() {
    const next: Lang = lang === "en" ? "zh" : "en";
    setLang(next);
    storeLang(next);
  }

  return (
    <main>
      <header className="gov-header">
        <div className="gov-header-inner">
          <a className="gov-logotype" href="/">
            {t(lang, "brand")}
          </a>
          <span className="svc">{t(lang, "caseArchive")}</span>
          <span className="right">
            <button onClick={() => router.push("/staff")}>{t(lang, "staffRecords")}</button>
            <button onClick={toggleLang}>{t(lang, "langToggle")}</button>
          </span>
        </div>
      </header>
      <div className="blue-bar" />

      <div className="page" style={{ maxWidth: 860 }}>
        <h1 className="h-xl" style={{ fontSize: 32 }}>
          {t(lang, "caseArchive")}
        </h1>
        <p className="lede" style={{ fontSize: 16 }}>
          {t(lang, "caseArchiveDesc")}
        </p>

        {list.length === 0 && (
          <p style={{ color: "var(--ink-2)", marginTop: 20 }}>{t(lang, "archiveEmpty")}</p>
        )}

        {list.length > 0 && (
          <table className="window-table" style={{ marginTop: 20, maxWidth: "100%" }}>
            <tbody>
              {list.map((c) => {
                const stats = computeStats(c.events);
                const cond = c.conditionId ? CONDITION_MAP[c.conditionId] : undefined;
                return (
                  <tr key={c.caseId}>
                    <td style={{ fontFamily: "var(--mono)", fontWeight: 400, fontSize: 12.5 }}>
                      {c.caseId}
                      <br />
                      <span style={{ color: "var(--ink-2)" }}>
                        {new Date(c.startedAt).toISOString().slice(0, 10)}
                      </span>
                    </td>
                    <td>
                      {c.matter}
                      <br />
                      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                        {stats.outcome} · {stats.windowsVisited} windows · {stats.referrals} ref ·{" "}
                        {stats.internalMemos + stats.escalations + stats.assignments} memos
                        {cond && cond.id !== "calm" ? ` · ${cond.name}` : ""}
                        {c.analysis ? " · analyzed" : ""}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <a href={`/report?id=${encodeURIComponent(c.caseId)}`}>
                        {t(lang, "openReport")} →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {list.length > 0 && (
          <div className="report-actions">
            <button
              className="btn-plain"
              onClick={() => download("aib-archive.json", JSON.stringify(list, null, 2))}
            >
              {t(lang, "exportAll")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
