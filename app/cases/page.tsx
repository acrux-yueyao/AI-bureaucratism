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

const PIDS = ["P1", "P2", "P3", "P4", "P5", "P6"];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={"chip" + (on ? " chip-on" : "")} onClick={onClick}>
      {children}
    </button>
  );
}

export default function CasesPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [list, setList] = useState<ArchivedCase[]>([]);
  const [seed, setSeed] = useState<SeedCase[]>([]);
  const [seedState, setSeedState] = useState<"loading" | "ok" | "empty">("loading");
  const [abl, setAbl] = useState<string | null>(null);
  const [scen, setScen] = useState<string | null>(null);
  const [pid, setPid] = useState<string | null>(null);
  const [pabl, setPabl] = useState<string | null>(null);

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

  const machine = seed.filter((c) => c.batch === "main01");
  const pilot = seed
    .filter((c) => c.batch === "pilot")
    .sort((a, b) => (a.participant ?? "").localeCompare(b.participant ?? "") || (a.round ?? 0) - (b.round ?? 0));
  const shownM = machine.filter((c) => (!abl || c.ablationId === abl) && (!scen || c.scenario === scen));
  const shownP = pilot.filter((c) => (!pid || c.participant === pid) && (!pabl || c.ablationId === pabl));

  const row = (c: ArchivedCase, s?: SeedCase) => {
    const stats = computeStats(c.events);
    const cond = c.conditionId ? CONDITION_MAP[c.conditionId] : undefined;
    const tag = !s
      ? ""
      : s.batch === "pilot"
        ? `${s.participant} · ${L(ABL[s.ablationId ?? ""], s.ablationId ?? "")} · ${t(lang, "archiveRound").replace("{n}", String(s.round ?? ""))} · ${s.lang} · ${s.minutes} min · `
        : `${L(ABL[s.ablationId ?? ""], s.ablationId ?? "")} · ${L(SCEN[s.scenario ?? ""], s.scenario ?? "")} · `;
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
            {tag}
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
              <button className="btn-plain" onClick={() => download("aib-archive.json", JSON.stringify(list, null, 2))}>
                {t(lang, "exportAll")}
              </button>
            </div>
          </>
        )}

        {seedState === "loading" && (
          <p style={{ color: "var(--ink-2)", marginTop: 28 }}>{t(lang, "archiveSeedLoading")}</p>
        )}

        {pilot.length > 0 && (
          <>
            <h2 style={{ fontSize: 22, marginTop: list.length > 0 ? 40 : 28 }}>{t(lang, "archivePilotTitle")}</h2>
            <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 6, maxWidth: 720 }}>{t(lang, "archivePilotDesc")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              <Chip on={!pid} onClick={() => setPid(null)}>
                {t(lang, "archiveAll")}
              </Chip>
              {PIDS.map((p) => (
                <Chip key={p} on={pid === p} onClick={() => setPid(pid === p ? null : p)}>
                  {p}
                </Chip>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <Chip on={!pabl} onClick={() => setPabl(null)}>
                {t(lang, "archiveAll")}
              </Chip>
              {["full", "flat"].map((k) => (
                <Chip key={k} on={pabl === k} onClick={() => setPabl(pabl === k ? null : k)}>
                  {L(ABL[k], k)}
                </Chip>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 12 }}>
              {t(lang, "archiveSessions").replace("{n}", String(shownP.length))}
            </p>
            <table className="window-table" style={{ marginTop: 8, maxWidth: "100%" }}>
              <tbody>{shownP.map((c) => row(c, c))}</tbody>
            </table>
          </>
        )}

        {machine.length > 0 && (
          <>
            <h2 style={{ fontSize: 22, marginTop: 40 }}>{t(lang, "archiveSeedTitle")}</h2>
            <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 6, maxWidth: 720 }}>{t(lang, "archiveSeedDesc")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              <Chip on={!abl} onClick={() => setAbl(null)}>
                {t(lang, "archiveAll")}
              </Chip>
              {Object.keys(ABL).map((k) => (
                <Chip key={k} on={abl === k} onClick={() => setAbl(abl === k ? null : k)}>
                  {L(ABL[k], k)}
                </Chip>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <Chip on={!scen} onClick={() => setScen(null)}>
                {t(lang, "archiveAll")}
              </Chip>
              {Object.keys(SCEN).map((k) => (
                <Chip key={k} on={scen === k} onClick={() => setScen(scen === k ? null : k)}>
                  {L(SCEN[k], k)}
                </Chip>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 12 }}>
              {t(lang, "archiveCount").replace("{n}", String(shownM.length))}
            </p>
            <table className="window-table" style={{ marginTop: 8, maxWidth: "100%" }}>
              <tbody>{shownM.map((c) => row(c, c))}</tbody>
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
