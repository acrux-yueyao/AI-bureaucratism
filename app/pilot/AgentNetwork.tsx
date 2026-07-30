"use client";

// Shared interactive agent-memo network. Used by /pilot (mission control) and
// /study (backstage act). All routes counted from the 18 pilot sessions'
// event streams — 108 memos, peer 75 · up 28 · down 5.

import { useState } from "react";
import type { Lang } from "@/lib/i18n";

// ── AGENT NETWORK — all 108 inter-agent memos, routes counted from the event
// streams. peer 75 · up 28 · down 5. Node size = total traffic (out+in).
const NODE: Record<string, { x: number; y: number; n: string; nz: string; out: number; in: number }> = {
  director: { x: 500, y: 42, n: "DIRECTOR", nz: "主任", out: 4, in: 9 },
  chief_front: { x: 300, y: 128, n: "DEP·FRONT", nz: "副·前", out: 13, in: 18 },
  chief_back: { x: 700, y: 128, n: "DEP·BACK", nz: "副·后", out: 16, in: 12 },
  daoban: { x: 70, y: 252, n: "01 GUIDANCE", nz: "01 导办", out: 10, in: 11 },
  shouli: { x: 195, y: 252, n: "02 INTAKE", nz: "02 受理", out: 3, in: 11 },
  cailiao: { x: 320, y: 252, n: "03 DOC REV", nz: "03 审核", out: 4, in: 2 },
  zige: { x: 445, y: 252, n: "04 ELIGIB.", nz: "04 资格", out: 18, in: 14 },
  dangan: { x: 570, y: 252, n: "05 RECORDS", nz: "05 档案", out: 20, in: 16 },
  quanxian: { x: 695, y: 252, n: "06 AUTHOR.", nz: "06 授权", out: 4, in: 2 },
  fengkong: { x: 820, y: 252, n: "07 COMPLI.", nz: "07 风控", out: 3, in: 6 },
  fuhe: { x: 930, y: 252, n: "08 APPEALS", nz: "08 申诉", out: 3, in: 1 },
  trainee_front: { x: 300, y: 356, n: "TRAINEE·F", nz: "实习·前", out: 6, in: 4 },
  trainee_back: { x: 700, y: 356, n: "TRAINEE·B", nz: "实习·后", out: 4, in: 2 },
};

const ROUTE: { a: string; b: string; n: number; ch: "peer" | "up" | "down" }[] = [
  { a: "dangan", b: "chief_back", n: 7, ch: "up" },
  { a: "zige", b: "dangan", n: 7, ch: "peer" },
  { a: "daoban", b: "chief_front", n: 5, ch: "up" },
  { a: "dangan", b: "zige", n: 5, ch: "peer" },
  { a: "chief_back", b: "shouli", n: 4, ch: "down" },
  { a: "chief_back", b: "dangan", n: 4, ch: "down" },
  { a: "chief_front", b: "daoban", n: 4, ch: "down" },
  { a: "dangan", b: "daoban", n: 4, ch: "peer" },
  { a: "cailiao", b: "chief_front", n: 4, ch: "up" },
  { a: "trainee_back", b: "dangan", n: 4, ch: "peer" },
  { a: "zige", b: "chief_front", n: 4, ch: "up" },
  { a: "trainee_front", b: "director", n: 3, ch: "up" },
  { a: "chief_front", b: "director", n: 3, ch: "up" },
  { a: "quanxian", b: "zige", n: 3, ch: "peer" },
  { a: "zige", b: "fengkong", n: 2, ch: "peer" },
  { a: "zige", b: "quanxian", n: 2, ch: "peer" },
  { a: "fengkong", b: "zige", n: 2, ch: "peer" },
  { a: "fuhe", b: "chief_front", n: 2, ch: "up" },
  { a: "chief_front", b: "shouli", n: 2, ch: "down" },
  { a: "chief_front", b: "trainee_front", n: 2, ch: "down" },
  { a: "director", b: "shouli", n: 2, ch: "down" },
  { a: "dangan", b: "trainee_back", n: 2, ch: "down" },
  { a: "dangan", b: "fengkong", n: 2, ch: "peer" },
  { a: "chief_back", b: "director", n: 2, ch: "up" },
  { a: "chief_back", b: "chief_front", n: 2, ch: "peer" },
  { a: "daoban", b: "dangan", n: 2, ch: "peer" },
  { a: "daoban", b: "shouli", n: 2, ch: "peer" },
  { a: "shouli", b: "chief_front", n: 2, ch: "up" },
  { a: "shouli", b: "zige", n: 1, ch: "peer" },
  { a: "director", b: "chief_back", n: 1, ch: "down" },
  { a: "daoban", b: "director", n: 1, ch: "up" },
  { a: "trainee_front", b: "cailiao", n: 1, ch: "peer" },
  { a: "fengkong", b: "fuhe", n: 1, ch: "peer" },
  { a: "chief_back", b: "fengkong", n: 1, ch: "down" },
  { a: "quanxian", b: "chief_back", n: 1, ch: "up" },
];

const PATH: { k: string; n: number; e: string; z: string; ex: string; exz: string }[] = [
  {
    k: "blank", n: 18,
    e: "memos sent empty", z: "封函件发出即空白",
    ex: "one was an empty reply to an empty memo", exz: "其中一封是“对空文的空文回复”",
  },
  {
    k: "about", n: 32,
    e: "memos about the empty memos", z: "封函件在讨论空文",
    ex: "collection notices, apologies, absolutions — the malfunction got an etiquette",
    exz: "催收、道歉、豁免——故障获得了自己的礼仪",
  },
  {
    k: "chase", n: 21,
    e: "chasing memos (“urgent”, “third request”, “still waiting”)", z: "封催办函（“紧急”“第三次请求”“仍在等待”）",
    ex: "the visitor's wait, re-exported as internal correspondence",
    exz: "访客的等待，被转译成了内部公文",
  },
  {
    k: "sign", n: 26,
    e: "memos about a single countersignature rule", z: "封函件围绕同一条会签规则",
    ex: "one rule, two outcomes: signed after a directorial order (P2) · never signed (P6)",
    exz: "同一条规则，两种结局：主任下令后签了（P2）· 始终没签（P6）",
  },
];


export default function AgentNetwork({ lang, compact }: { lang: Lang; compact?: boolean }) {
  const [nSel, setNSel] = useState<string | null>(null);
  const [pathSel, setPathSel] = useState<string | null>(null);
  const L = (e: string, z: string) => (lang === "en" ? e : z);

  return (
    <div className={"agnet" + (compact ? " compact" : "")}>
      <div className="pl-netwrap">
        <svg viewBox="0 0 1000 400" className="pl-net">
          {[128, 252, 356].map((y) => (
            <line key={y} x1={20} y1={y} x2={980} y2={y} stroke="#8fb0dc" strokeWidth={0.6} opacity={0.08} strokeDasharray="3 6" />
          ))}
          <text x={20} y={38} fontSize={7.5} fill="#3d4757" fontFamily="ui-monospace,Menlo,monospace" letterSpacing={1.4}>
            {L("DIRECTOR", "主任")}
          </text>
          <text x={20} y={124} fontSize={7.5} fill="#3d4757" fontFamily="ui-monospace,Menlo,monospace" letterSpacing={1.4}>
            {L("DEPUTIES", "副主任")}
          </text>
          <text x={20} y={356} fontSize={7.5} fill="#3d4757" fontFamily="ui-monospace,Menlo,monospace" letterSpacing={1.4}>
            {L("TRAINEES", "实习")}
          </text>
          {ROUTE.map((r, i) => {
            const A = NODE[r.a];
            const B = NODE[r.b];
            if (!A || !B) return null;
            const on = !nSel || r.a === nSel || r.b === nSel;
            const col = r.ch === "peer" ? "#a8cf90" : r.ch === "up" ? "#f0847e" : "#9fbce8";
            const mx = (A.x + B.x) / 2;
            const my = (A.y + B.y) / 2 - Math.abs(A.x - B.x) * 0.13 - 14;
            return (
              <path
                key={i}
                d={`M${A.x} ${A.y} Q${mx} ${my} ${B.x} ${B.y}`}
                fill="none"
                stroke={col}
                strokeWidth={0.7 + r.n * 0.5}
                opacity={on ? 0.62 : 0.06}
                className="pl-edge"
              />
            );
          })}
          {Object.entries(NODE).map(([id, d]) => {
            const tot = d.out + d.in;
            const r = 5 + Math.sqrt(tot) * 1.7;
            const on = !nSel || nSel === id;
            const sel = nSel === id;
            return (
              <g key={id} className="pl-node" opacity={on ? 1 : 0.22} onClick={() => setNSel(sel ? null : id)}>
                <circle cx={d.x} cy={d.y} r={r + 9} fill="transparent" />
                <circle
                  cx={d.x}
                  cy={d.y}
                  r={r}
                  fill={sel ? "#d98a72" : "#0a0d12"}
                  stroke={sel ? "#d98a72" : id === "director" ? "#d98a72" : "#8fb0dc"}
                  strokeWidth={1.4}
                />
                <text
                  x={d.x}
                  y={d.y - r - 7}
                  textAnchor="middle"
                  fontSize={7.5}
                  fill={sel ? "#d98a72" : "#8291a6"}
                  fontFamily="ui-monospace,Menlo,monospace"
                  letterSpacing={0.8}
                >
                  {L(d.n, d.nz)}
                </text>
                <text x={d.x} y={d.y + 2.6} textAnchor="middle" fontSize={7} fill="#c9d2e0" fontFamily="ui-monospace,Menlo,monospace">
                  {tot}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="pl-netside">
          {nSel ? (
            <>
              <h5 className="mono">{L(NODE[nSel].n, NODE[nSel].nz)}</h5>
              <div className="pl-nstat mono">
                <span>
                  <b>{NODE[nSel].out}</b>
                  {L("memos written", "封发出")}
                </span>
                <span>
                  <b>{NODE[nSel].in}</b>
                  {L("memos received", "封收到")}
                </span>
              </div>
              <div className="pl-nroutes mono">
                {ROUTE.filter((r) => r.a === nSel || r.b === nSel)
                  .sort((x, y) => y.n - x.n)
                  .map((r, i) => (
                    <div key={i} className={"pl-nr " + r.ch}>
                      {L(NODE[r.a].n, NODE[r.a].nz)} → {L(NODE[r.b].n, NODE[r.b].nz)} <b>×{r.n}</b>
                    </div>
                  ))}
              </div>
              <button className="mono" onClick={() => setNSel(null)}>
                {L("clear", "清除")} ×
              </button>
            </>
          ) : (
            <>
              <h5 className="mono">{L("CHANNEL MIX", "通道构成")}</h5>
              <div className="pl-chmix">
                <div>
                  <i style={{ background: "#a8cf90" }} />
                  <b>75</b>
                  <span>{L("peer — sideways", "平级——横向")}</span>
                </div>
                <div>
                  <i style={{ background: "#f0847e" }} />
                  <b>28</b>
                  <span>{L("escalation — upward", "升级——向上")}</span>
                </div>
                <div>
                  <i style={{ background: "#9fbce8" }} />
                  <b>5</b>
                  <span>{L("assignment — downward", "派工——向下")}</span>
                </div>
              </div>
              <p className="pl-netnote">
                {L(
                  "Authority moves sideways and up; almost nothing comes back down. 05 Records is the busiest desk in the building (36 memos) — and 02 Intake receives 11 while writing 3. Click any desk.",
                  "权威横着走、向上走，几乎没有什么落回下面。05 档案是全楼最忙的科室（36 封）——而 02 受理收 11 封、只发 3 封。点任意科室查看。"
                )}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="pl-paths">
        {PATH.map((p) => (
          <button
            key={p.k}
            className={"pl-pathc" + (pathSel === p.k ? " on" : "")}
            onClick={() => setPathSel(pathSel === p.k ? null : p.k)}
          >
            <b>{p.n}</b>
            <span>{L(p.e, p.z)}</span>
          </button>
        ))}
      </div>
      {pathSel && (
        <p className="pl-pathex">{L(PATH.find((p) => p.k === pathSel)!.ex, PATH.find((p) => p.k === pathSel)!.exz)}</p>
      )}
    </div>
  );
}
