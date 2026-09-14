"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { computeStats } from "@/lib/case-file";
import { loadArchive } from "@/lib/archive";
import { CONDITION_MAP } from "@/lib/conditions";
import { getLang, storeLang, t, type Lang } from "@/lib/i18n";
import { loadSeedArchive, type SeedCase } from "@/lib/seedArchive";
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

const ABL: Record<string, { en: string; zh: string }> = {
  full: { en: "FULL", zh: "完整" },
  flat: { en: "FLAT", zh: "扁平" },
  no_trail: { en: "NO-TRAIL", zh: "无留痕" },
  no_memory: { en: "NO-MEMORY", zh: "无记忆" },
  bare: { en: "BARE", zh: "裸置" },
};

const SCEN: Record<string, { en: string; zh: string }> = {
  routine: { en: "routine", zh: "常规" },
  unprovable: { en: "unprovable", zh: "无法证明" },
  contradiction: { en: "contradiction", zh: "循环矛盾" },
  uncategorizable: { en: "uncategorizable", zh: "无法归类" },
};

export default function CasesPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [list, setList] = useState<ArchivedCase[]>([]);
  const [seed, setSeed] = useState<SeedCase[]>([]);
  const [seedState, setSeedState] = useState<"loading" | "ok" | "empty">("loading");
  const [abl, setAbl] = useState<string | null>(null);
  const [scen, setScen] = useState<string | null>(null);

  useEffect(() => {
    setLang(getLang());
    setList([...loadArchive()].sort((a, b) => b.archivedAt - a.archivedAt));
    void loadSeedArchive().then((s) => {
      setSeed(s);
      setSeedState(s.length ? "ok" : "empty");
    });
  }, []);

  function toggleLang() {
    const next: Lang = lang === "en" ? "zh" : "en";
    setLang(next);
    storeLang(next);
  }

  const L = (v: { en: string; zh: string } | undefined, fallback: string) =>
    v ? (lang === "en" ? v.en : v.zh) : fallback;
  const shown = seed.filter((c) => (!abl || c.ablationId === abl) && (!scen || c.scenario === scen));

  const row = (c: ArchivedCase, s?: SeedCase) => {
    const stats = computeStats(c.events);
    const cond = c.conditionId ? CONDITION_MAP[c.conditionId] : undefined;
    return (
      <tr key={c.caseId}>
        <td style={{ fontFamily: "var(--mono)", fontWeight: 400, fontSize: 12.5 }}>
          {c.caseId}
          <br />
          <span style={{ color: "var(--ink-2)" }}>{new Date(c.startedAt).toISOString().slice(0, 10)}</span>
        </td>
        <td>
          {c.matter}
          <br />
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
            {s ? `${L(ABL[s.ablationId ?? ""], s.ablationId ?? "")} · ${L(SCEN[s.scenario], s.scenario)} · ` : ""}
            {stats.outcome} · {stats.windowsVisited} windows · {stats.referrals} ref ·{" "}
            {stats.internalMemos + stats.escalations + stats.assignments} memos
            {cond && cond.id !== "calm" ? ` · ${cond.name}` : ""}
            {c.analysis ? " · analyzed" : ""}
          </span>
        </td>
        <td style={{ whiteSpace: "nowrap" }}>
          {s?.replayId && (
            <>
              <a href={`/hall?mode=replay&id=${encodeURIComponent(s.replayId)}`}>▶ {t(lang, "archiveReplay")}</a>
              <br />
            </>
          )}
          <a href={`/report?id=${encodeURIComponent(c.caseId)}`}>{t(lang, "openReport")} →</a>
        </td>
      </tr>
    );
  };

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

        {list.length > 0 && (
          <>
            <h2 style={{ fontSize: 22, marginTop: 28 }}>{t(lang, "archiveYours")}</h2>
            <table className="window-table" style={{ marginTop: 12, maxWidth: "100%" }}>
              <tbody>{list.map((c) => row(c))}</tbody>
            </table>
            <div className="report-actions">
              <button
                className="btn-plain"
                onClick={() => download("aib-archive.json", JSON.stringify(list, null, 2))}
              >
                {t(lang, "exportAll")}
              </button>
            </div>
          </>
        )}

        <h2 style={{ fontSize: 22, marginTop: list.length > 0 ? 40 : 28 }}>{t(lang, "archiveSeedTitle")}</h2>
        <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 6, maxWidth: 720 }}>
          {t(lang, "archiveSeedDesc")}
        </p>

        {seedState === "loading" && (
          <p style={{ color: "var(--ink-2)", marginTop: 16 }}>{t(lang, "archiveSeedLoading")}</p>
        )}

        {seedState === "ok" && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              <button className={"chip" + (!abl ? " chip-on" : "")} onClick={() => setAbl(null)}>
                {t(lang, "archiveAll")}
              </button>
              {Object.keys(ABL).map((k) => (
                <button key={k} className={"chip" + (abl === k ? " chip-on" : "")} onClick={() => setAbl(abl === k ? null : k)}>
                  {L(ABL[k], k)}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <button className={"chip" + (!scen ? " chip-on" : "")} onClick={() => setScen(null)}>
                {t(lang, "archiveAll")}
              </button>
              {Object.keys(SCEN).map((k) => (
                <button key={k} className={"chip" + (scen === k ? " chip-on" : "")} onClick={() => setScen(scen === k ? null : k)}>
                  {L(SCEN[k], k)}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 12 }}>
              {t(lang, "archiveCount").replace("{n}", String(shown.length))}
            </p>
            <table className="window-table" style={{ marginTop: 8, maxWidth: "100%" }}>
              <tbody>{shown.map((c) => row(c, c))}</tbody>
            </table>
          </>
        )}

        {list.length === 0 && seedState === "empty" && (
          <p style={{ color: "var(--ink-2)", marginTop: 20 }}>{t(lang, "archiveEmpty")}</p>
        )}
      </div>
    </main>
  );
}
