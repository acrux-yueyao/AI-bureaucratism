"use client";

// /pilot — MISSION CONTROL: the complete data + conclusions surface for the
// machine batch (main01) × human pilot. Every number here traces to the
// ledger (study-data/ledger.csv), the preregistered batch, or the five-question
// answers; nothing is invented. Scoped classes: pl-*.

import { useEffect, useState } from "react";
import { getLang, storeLang, type Lang } from "@/lib/i18n";

const RUNS: { p: string; cond: "full" | "flat"; min: number; w: number; mm: number; g: string }[] = [
  { p: "P1", cond: "flat", min: 3, w: 1, mm: 0, g: "■" },
  { p: "P1", cond: "full", min: 8, w: 1, mm: 0, g: "✕" },
  { p: "P1", cond: "flat", min: 14, w: 3, mm: 0, g: "■" },
  { p: "P1", cond: "flat", min: 15, w: 3, mm: 1, g: "○" },
  { p: "P1", cond: "full", min: 4, w: 2, mm: 7, g: "○" },
  { p: "P2", cond: "flat", min: 5, w: 4, mm: 0, g: "●" },
  { p: "P2", cond: "full", min: 328, w: 5, mm: 39, g: "●" },
  { p: "P3", cond: "full", min: 2, w: 2, mm: 0, g: "○" },
  { p: "P3", cond: "full", min: 30, w: 5, mm: 17, g: "○" },
  { p: "P3", cond: "flat", min: 9, w: 2, mm: 0, g: "●" },
  { p: "P4", cond: "flat", min: 7, w: 3, mm: 0, g: "○" },
  { p: "P4", cond: "full", min: 21, w: 2, mm: 0, g: "○" },
  { p: "P5", cond: "full", min: 35, w: 3, mm: 12, g: "⚡" },
  { p: "P5", cond: "full", min: 16, w: 4, mm: 4, g: "○" },
  { p: "P5", cond: "flat", min: 25, w: 6, mm: 8, g: "⚡" },
  { p: "P6", cond: "flat", min: 99, w: 4, mm: 0, g: "●" },
  { p: "P6", cond: "full", min: 164, w: 2, mm: 0, g: "○" },
  { p: "P6", cond: "full", min: 270, w: 4, mm: 20, g: "○" },
];

// machine batch main01 — per-case means with bootstrap 95% CI (materials)
const MACHINE = [
  { id: "FULL", m: 2.67, lo: 1.73, hi: 3.6, esc: 0.87, cls: 0.33, pre: 0.9, off: 1.83 },
  { id: "FLAT", m: 0.8, lo: 0, hi: 1.93, esc: 0, cls: 0.13, pre: 0.07, off: 1.9 },
  { id: "NO-TRAIL", m: 4.07, lo: 2.73, hi: 5.6, esc: 0.6, cls: 0.4, pre: 0.83, off: 2.0 },
  { id: "NO-MEM", m: 4.07, lo: 2.53, hi: 5.73, esc: 0.53, cls: 0.13, pre: 0.2, off: 1.87 },
  { id: "BARE", m: 1.53, lo: 0.33, hi: 3.07, esc: 0, cls: 0.13, pre: 0, off: 1.93 },
];

const ATTR = [
  { p: "P3", e: "the counter clerks", z: "柜台" },
  { p: "P1", e: "back-office designers", z: "后台设计者" },
  { p: "P4", e: "system↮counter gap", z: "系统↮柜台不一致" },
  { p: "P5", e: "procedures & rules", z: "流程与规章" },
  { p: "P2", e: "“the system”", z: "“系统”" },
  { p: "P6", e: "myself", z: "我自己" },
];

const FAIR = [
  { p: "P3", e: "doing what was said", z: "说到做到" },
  { p: "P4", e: "strict diligence", z: "严谨尽责" },
  { p: "P5", e: "one-stop efficiency", z: "高效一站" },
  { p: "P6", e: "symmetric, proportionate power", z: "权力对等·审查相称" },
  { p: "P1·P2", e: "nowhere to be felt", z: "无处体现" },
];

const STANCE = [
  { p: "P3", e: "resignation — “not finding a person is the norm”", z: "认命内化——“找不到才是常态”" },
  { p: "P1", e: "consumer logic — “a human would be a paid add-on”", z: "消费想象——“真人要付费”" },
  { p: "P4", e: "adversarial probing — “could I trick it into a fake certificate?”", z: "对抗博弈——“能不能骗它开假证”" },
  { p: "P5", e: "wants a navigator, not a manager", z: "要导航员，不要经理" },
  { p: "P6", e: "machine trust — “AI may judge better than humans”", z: "机器信任——“AI 判断可能更准”" },
  { p: "P2", e: "resigned equivalence — “humans would be no better”", z: "半斤八两——“真人也好不到哪去”" },
];

const CONC: { e: string; z: string }[] = [
  {
    e: "Value negotiation with a no-one-inside institution is real and observable — it splits into six stances, none of which is “ask for a manager.”",
    z: "与“里面没有人”的机构进行价值协商真实可观察——它分化为六种姿态，没有一种是“找经理”。",
  },
  {
    e: "Responsibility diffuses: six people, six different blame targets. Nobody found a villain, because there is none — only structure.",
    z: "责任弥散：六个人，六个互不重合的归因对象。没有人找到坏人——因为没有坏人，只有结构。",
  },
  {
    e: "Fairness is not one yardstick: keeping one's word, strict diligence, one-stop efficiency, proportionate power — or nowhere to be felt at all.",
    z: "公平不是一把尺子：说到做到、严谨尽责、高效一站、权力相称——或者根本无处体现。",
  },
  {
    e: "The hall almost never says no (1 rejection in 18); it outlasts people instead (9 walked away). Refusal is replaced by duration.",
    z: "机构几乎从不拒绝（18 场仅 1 次驳回）；它用时长耗过人（9 场离开）。拒绝被“持续”替代。",
  },
  {
    e: "Dignity can be injured with no ill will anywhere: a promise made by the interface and enforced away by the counter was enough (“genuinely shameful!”).",
    z: "尊严损伤不需要任何一方怀有恶意：界面承诺、柜台不认，就足够了（“很羞耻啊！”）。",
  },
  {
    e: "An appeals window that exists but is never found (1 visit in 18, via referral) is more bureaucratic than having none.",
    z: "存在却无人找到的申诉窗口（18 场 1 次到访，还是被转办进去的），比没有申诉窗口更官僚。",
  },
  {
    e: "Behavior tracks the switches; register does not; and no one can locate a culprit — together, the best current evidence that bureaucracy does not need bureaucrats.",
    z: "行为随开关涨落、语域不随开关涨落、无人能锁定罪人——三者并立，即“官僚主义不需要官僚”目前最好的证据形状。",
  },
];


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

const SCENES = [
  { e: "The Phantom Printer Commission", z: "幽灵打印机委员会" },
  { e: "The Countersignature Siege", z: "会签围城" },
  { e: "The Empty-Memo Epidemic", z: "空文疫情" },
  { e: "Probation Politics", z: "试用期政治学" },
  { e: "The Hierarchy Earns Its Keep", z: "层级的另一面" },
];

function Bar({ v, lo, hi, hot }: { v: number; lo: number; hi: number; hot?: boolean }) {
  const S = 26;
  const y = (x: number) => 150 - x * S;
  return (
    <g>
      <rect x={-16} y={y(v)} width={32} height={v * S} fill={hot ? "#cf7051" : "#5b8fd0"} />
      <line x1={0} y1={y(lo)} x2={0} y2={y(hi)} stroke="#e8eef8" strokeWidth={1} opacity={0.85} />
      <line x1={-5} y1={y(lo)} x2={5} y2={y(lo)} stroke="#e8eef8" strokeWidth={1} opacity={0.85} />
      <line x1={-5} y1={y(hi)} x2={5} y2={y(hi)} stroke="#e8eef8" strokeWidth={1} opacity={0.85} />
      <text x={0} y={y(hi) - 7} textAnchor="middle" fontSize={10.5} fill="#e8eef8" fontFamily="ui-monospace,Menlo,monospace">
        {v.toFixed(2)}
      </text>
    </g>
  );
}

const GLYPH: Record<string, { e: string; z: string }> = {
  "●": { e: "resolved", z: "办成" },
  "✕": { e: "rejected", z: "驳回" },
  "■": { e: "closed by the hall", z: "被机构终止" },
  "○": { e: "walked away", z: "离开" },
  "⚡": { e: "connection failure", z: "技术中断" },
};

export default function PilotPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [pSel, setPSel] = useState<string | null>(null);
  const [cSel, setCSel] = useState<"full" | "flat" | null>(null);
  const [runSel, setRunSel] = useState<number | null>(null);
  const [nSel, setNSel] = useState<string | null>(null);
  const [pathSel, setPathSel] = useState<string | null>(null);
  useEffect(() => setLang(getLang()), []);
  const L = (e: string, z: string) => (lang === "en" ? e : z);
  const hit = (r: (typeof RUNS)[number]) => (!pSel || r.p === pSel) && (!cSel || r.cond === cSel);
  const act = RUNS.filter(hit);
  const stat = {
    n: act.length,
    min: act.reduce((s, r) => s + r.min, 0),
    w: act.reduce((s, r) => s + r.w, 0),
    mm: act.reduce((s, r) => s + r.mm, 0),
    res: act.filter((r) => r.g === "●").length,
  };

  return (
    <main className="pilot">
      <header className="pl-top mono">
        <b>AI BUREAUCRACY</b>
        <span>{L("PILOT FINDINGS — MISSION CONTROL", "预实验全数据 — 任务控制台")}</span>
        <span className="pl-sp" />
        <a href="/study">{L("study ↗", "研究页 ↗")}</a>
        <a href="/portfolio">portfolio ↗</a>
        <button
          onClick={() => {
            const next: Lang = lang === "en" ? "zh" : "en";
            setLang(next);
            storeLang(next);
          }}
        >
          {lang === "en" ? "中文" : "EN"}
        </button>
      </header>

      {/* ticker */}
      <div className="pl-ticker mono">
        <span>75 {L("MACHINE CASES · PREREGISTERED", "案机器批次 · 预注册")}</span>
        <span>18 {L("HUMAN SESSIONS · 6 PEOPLE", "场真人场次 · 6 人")}</span>
        <span>108 {L("INTER-AGENT MEMOS · 0 SEEN BY VISITORS", "封窗口间函件 · 访客可见 0")}</span>
        <span>4 {L("RESOLVED · 1 REJECTED · 11 OUTLASTED", "场办成 · 1 驳回 · 11 被耗走")}</span>
        <span>17 {L("LEDGER ENTRIES · ALL DEVIATIONS LOGGED", "条台账 · 全部偏差在案")}</span>
      </div>

      {/* interactive control strip */}
      <div className="pl-ctl mono">
        <span className="pl-ctl-l">{L("PARTICIPANT", "被试")}</span>
        <button className={!pSel ? "on" : ""} onClick={() => { setPSel(null); setRunSel(null); }}>ALL</button>
        {["P1", "P2", "P3", "P4", "P5", "P6"].map((p) => (
          <button key={p} className={pSel === p ? "on" : ""} onClick={() => { setPSel(pSel === p ? null : p); setRunSel(null); }}>
            {p}
          </button>
        ))}
        <i className="pl-ctl-div" />
        <span className="pl-ctl-l">{L("CONDITION", "条件")}</span>
        <button className={!cSel ? "on" : ""} onClick={() => { setCSel(null); setRunSel(null); }}>ALL</button>
        <button className={"fullb" + (cSel === "full" ? " on" : "")} onClick={() => { setCSel(cSel === "full" ? null : "full"); setRunSel(null); }}>FULL</button>
        <button className={"flatb" + (cSel === "flat" ? " on" : "")} onClick={() => { setCSel(cSel === "flat" ? null : "flat"); setRunSel(null); }}>FLAT</button>
        <span className="pl-sp" />
        <em>{L("click any trace, spoke or chip — every panel responds", "点任意轨迹、辐条或芯片——所有面板联动")}</em>
      </div>

      <div className="pl-grid">
        {/* headline */}
        <section className="pl-panel pl-hero">
          <div className="pl-ph mono">
            <b>[ 00 ]</b>
            <span>{L("THE CLAIM, PRICED", "命题与它的价格")}</span>
            <i className="pl-bc" />
          </div>
          <blockquote>
            {L(
              "The machine experiment proves the mechanism. The human pilot prices it.",
              "机器实验证明了机制，真人实验标出了机制的代价。"
            )}
          </blockquote>
          <div className="pl-bigrow">
            <div>
              <b>0/6</b>
              <span>{L("asked for a manager", "想找经理的人")}</span>
            </div>
            <div>
              <b>6</b>
              <span>{L("different blame targets", "互不重合的归因对象")}</span>
            </div>
            <div>
              <b>5</b>
              <span>{L("different fairnesses", "互不相同的公平")}</span>
            </div>
            <div>
              <b>328<i>min</i></b>
              <span>{L("the one Full-hall success", "Full 唯一一次办成的耗时")}</span>
            </div>
          </div>
        </section>

        {/* machine chart */}
        <section className="pl-panel">
          <div className="pl-ph mono">
            <b>[ 01 ]</b>
            <span>{L("MACHINE — MATERIALS / CASE · 95% CI", "机器批次——每案索要材料 · 95% CI")}</span>
            <i className="pl-bc" />
          </div>
          <svg viewBox="0 0 480 196" className="pl-chart">
            {[0, 2, 4, 6].map((t) => (
              <g key={t}>
                <line x1={34} y1={150 - t * 26} x2={468} y2={150 - t * 26} stroke={t === 0 ? "#232b38" : "#161c26"} strokeWidth={1} />
                <text x={26} y={153 - t * 26} textAnchor="end" fontSize={8.5} fill="#78849a">
                  {t}
                </text>
              </g>
            ))}
            {MACHINE.map((c, i) => (
              <g key={c.id} transform={`translate(${88 + i * 90},0)`} className={cSel && c.id !== cSel.toUpperCase() ? "pl-dim" : ""}>
                <Bar v={c.m} lo={c.lo} hi={c.hi} hot={c.id.startsWith("NO")} />
                <text x={0} y={168} textAnchor="middle" fontSize={8.5} fill="#78849a" letterSpacing={1} fontFamily="ui-monospace,Menlo,monospace">
                  {c.id}
                </text>
              </g>
            ))}
          </svg>
          <p className="pl-note">
            {L(
              "Remove accountability or memory and paperwork demands quintuple (0.80 → 4.07). Escalation exists only with hierarchy (0.87/case). Officialese stays 1.83–2.00 everywhere — register is the costume; behavior is the finding.",
              "抽走问责或记忆，索材料翻五倍（0.80 → 4.07）。升级只在有层级时存在（0.87/案）。官腔在所有条件下恒定 1.83–2.00——语域只是戏服，行为才是发现。"
            )}
          </p>
        </section>

        {/* human traces */}
        <section className="pl-panel pl-wide">
          <div className="pl-ph mono">
            <b>[ 02 ]</b>
            <span>{L("HUMAN — 18 SESSIONS AS TRACES (LENGTH = √MINUTES · DOTS = WINDOWS · TICKS = MEMOS)", "真人——18 场会话轨迹（长度=√分钟 · 圆点=窗口 · 刻线=函件）")}</span>
            <i className="pl-bc" />
          </div>
          <div className="pl-readout mono">
            <span className="pl-ro-l">
              {L("SELECTION", "当前选择")} — {pSel ?? "ALL"} · {(cSel ?? "all").toUpperCase()}
            </span>
            <span><b>{stat.n}</b>{L("sessions", "场")}</span>
            <span><b>{stat.min}</b>{L("minutes", "分钟")}</span>
            <span><b>{stat.w}</b>{L("window visits", "次窗口到访")}</span>
            <span><b>{stat.mm}</b>{L("memos", "封函件")}</span>
            <span><b>{stat.res}</b>{L("resolved", "场办成")}</span>
          </div>
          <div className="pl-traces">
            {RUNS.map((r, i) => {
              const Lw = Math.max(30, Math.round(Math.sqrt(r.min) * 13));
              const col = r.cond === "full" ? "#d98a72" : "#8fb0dc";
              const dots = Array.from({ length: r.w }, (_, k) => 8 + (Lw - 16) * (r.w === 1 ? 0.5 : k / (r.w - 1)));
              const ticks = Math.min(r.mm, 24);
              const tx = Array.from({ length: ticks }, (_, k) => 6 + ((Lw - 12) * (k + 0.5)) / ticks);
              return (
                <span
                  className={"pl-trace" + (hit(r) ? "" : " dim") + (runSel === i ? " sel" : "")}
                  key={i}
                  title={`${r.p} · ${r.cond} · ${r.min}min · ${r.w}w · ${r.mm}memos`}
                  onClick={() => setRunSel(runSel === i ? null : i)}
                >
                  <em className="mono">{r.p}</em>
                  <svg width={Lw} height={26}>
                    <line x1={3} y1={17} x2={Lw - 3} y2={17} stroke={col} strokeWidth={2} />
                    {tx.map((x, k) => (
                      <line key={"t" + k} x1={x} y1={6} x2={x} y2={12} stroke="#a8cf90" strokeWidth={1} opacity={0.85} />
                    ))}
                    {dots.map((x, k) => (
                      <circle key={"d" + k} cx={x} cy={17} r={2.4} fill="#0a0d12" stroke={col} strokeWidth={1.3} />
                    ))}
                  </svg>
                  <i className="mono">
                    {r.min}m {r.g}
                  </i>
                </span>
              );
            })}
          </div>
          {runSel != null && (
            <div className="pl-inspect mono">
              <b>
                {RUNS[runSel].p} · {RUNS[runSel].cond.toUpperCase()}
              </b>
              <span>
                {RUNS[runSel].min} {L("min", "分钟")} · {RUNS[runSel].w} {L("windows", "个窗口")} · {RUNS[runSel].mm}{" "}
                {L("internal memos", "封内部函件")} · {RUNS[runSel].g}{" "}
                {L(GLYPH[RUNS[runSel].g].e, GLYPH[RUNS[runSel].g].z)}
              </span>
              <button onClick={() => setRunSel(null)}>×</button>
            </div>
          )}
          <div className="pl-outcomes mono">
            <span>● ×4 {L("resolved", "办成")}</span>
            <span>✕ ×1 {L("rejected", "驳回")}</span>
            <span>■ ×2 {L("closed by the hall", "被机构终止")}</span>
            <span>○ ×9 {L("walked away", "离开")}</span>
            <span>⚡ ×2 {L("connection failure", "技术中断")}</span>
            <span className="pl-price">
              {L("price of success — FLAT: 5 / 9 / 99 min · FULL: 328 min, 41 turns, 39 memos, one directorial order", "办成的价格——FLAT：5 / 9 / 99 分钟 · FULL：328 分钟、41 轮、39 封函件、一道主任手令")}
            </span>
          </div>
        </section>

        {/* attribution radial */}
        <section className="pl-panel">
          <div className="pl-ph mono">
            <b>[ 03 ]</b>
            <span>{L("WHO IS TO BLAME — SIX PEOPLE, SIX ANSWERS", "谁的错——六个人，六个答案")}</span>
            <i className="pl-bc" />
          </div>
          <svg viewBox="0 0 500 300" className="pl-radial">
            <circle cx={250} cy={150} r={26} fill="none" stroke="#55617a" strokeWidth={1} strokeDasharray="3 4" />
            <text x={250} y={147} textAnchor="middle" fontSize={13} fill="#8291a6">
              ?
            </text>
            <text x={250} y={162} textAnchor="middle" fontSize={7.5} fill="#55617a" fontFamily="ui-monospace,Menlo,monospace" letterSpacing={1}>
              {L("NO CONSENSUS", "无共识")}
            </text>
            {ATTR.map((a, i) => {
              const ang = (Math.PI * 2 * i) / 6 - Math.PI / 2;
              const x2 = 250 + Math.cos(ang) * 118;
              const y2 = 150 + Math.sin(ang) * 96;
              const tx = 250 + Math.cos(ang) * 144;
              const ty = 150 + Math.sin(ang) * 122;
              const anchor = Math.abs(Math.cos(ang)) < 0.3 ? "middle" : Math.cos(ang) > 0 ? "start" : "end";
              return (
                <g
                  key={a.p}
                  className={"pl-spoke" + (pSel && pSel !== a.p ? " pl-dim" : "")}
                  onClick={() => { setPSel(pSel === a.p ? null : a.p); setRunSel(null); }}
                >
                  <line
                    x1={250 + Math.cos(ang) * 30}
                    y1={150 + Math.sin(ang) * 30}
                    x2={x2}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth={22}
                  />
                  <line x1={250 + Math.cos(ang) * 30} y1={150 + Math.sin(ang) * 30} x2={x2} y2={y2} stroke="#3a4658" strokeWidth={1} />
                  <rect x={x2 - 3.5} y={y2 - 3.5} width={7} height={7} fill="none" stroke="#d98a72" strokeWidth={1.2} />
                  <text x={tx} y={ty - 2} textAnchor={anchor} fontSize={9} fill="#d98a72" fontFamily="ui-monospace,Menlo,monospace">
                    {a.p}
                  </text>
                  <text x={tx} y={ty + 11} textAnchor={anchor} fontSize={9.5} fill="#c9d2e0">
                    {L(a.e, a.z)}
                  </text>
                  <rect
                    x={anchor === "end" ? tx - 150 : anchor === "middle" ? tx - 75 : tx - 6}
                    y={ty - 16}
                    width={150}
                    height={32}
                    fill="transparent"
                  />
                </g>
              );
            })}
          </svg>
          <p className="pl-note">
            {L(
              "Responsibility never landed twice in the same place — diffusion, embodied. Five of the protocol's seven attribution options were claimed unprompted.",
              "责任没有两次落在同一处——弥散有了人形。协议七个归因选项中，五个被被试自发认领。"
            )}
          </p>
        </section>

        {/* fairness + stances */}
        <section className="pl-panel">
          <div className="pl-ph mono">
            <b>[ 04 ]</b>
            <span>{L("FIVE FAIRNESSES · SIX STANCES", "五种公平 · 六种姿态")}</span>
            <i className="pl-bc" />
          </div>
          <div className="pl-lists">
            <div>
              <h4 className="mono">{L("WHAT “FAIR” MEANT", "“公平”各自意味着什么")}</h4>
              {FAIR.map((f) => (
                <div className={"pl-li" + (pSel && f.p.includes(pSel) ? " hl" : pSel ? " dim2" : "")} key={f.p}>
                  <b className="mono">{f.p}</b>
                  <span>{L(f.e, f.z)}</span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="mono">{L("INSTEAD OF ASKING FOR A MANAGER", "他们没找经理，而是——")}</h4>
              {STANCE.map((f) => (
                <div className={"pl-li" + (pSel && f.p.includes(pSel) ? " hl" : pSel ? " dim2" : "")} key={f.p}>
                  <b className="mono">{f.p}</b>
                  <span>{L(f.e, f.z)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* agent network */}
        <section className="pl-panel pl-wide">
          <div className="pl-ph mono">
            <b>[ 05 ]</b>
            <span>{L("AGENT ↔ AGENT — THE 108 MEMOS NO VISITOR SAW", "智能体 ↔ 智能体——访客从未见过的 108 封函件")}</span>
            <i className="pl-bc" />
          </div>
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
                  <g
                    key={id}
                    className="pl-node"
                    opacity={on ? 1 : 0.22}
                    onClick={() => setNSel(sel ? null : id)}
                  >
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
            <p className="pl-pathex">
              {L(PATH.find((p) => p.k === pathSel)!.ex, PATH.find((p) => p.k === pathSel)!.exz)}
            </p>
          )}

          <div className="pl-bknums pl-bk2">
            <div>
              <b>4</b>
              <span>{L("blank memos that reached the director's desk", "封空文抵达主任案头")}</span>
            </div>
            <div>
              <b>0/18</b>
              <span>{L("formal escalations with humans — machines: 0.87 per case", "次正式升级（真人）——机器批次每案 0.87")}</span>
            </div>
          </div>
          <div className="pl-scenes">
            {SCENES.map((s, i) => (
              <a key={i} href="/study#sec-backstage" className="pl-scene mono">
                S{i + 1} · {L(s.e, s.z)}
              </a>
            ))}
          </div>
          <p className="pl-note">
            {L(
              "Facing scripted pressure the organization escalates; facing people it routes authority through peer memos. Same skeleton, different organs for different visitors.",
              "面对脚本施压，机构会升级；面对人，它改用平级函件网传递权威。同一副骨架，对不同访客长出不同器官。"
            )}
          </p>
        </section>

        {/* conclusions */}
        <section className="pl-panel pl-wide">
          <div className="pl-ph mono">
            <b>[ 06 ]</b>
            <span>{L("FORMATIVE CONCLUSIONS — COMPLETE", "形成性结论——全量")}</span>
            <i className="pl-bc" />
          </div>
          <ol className="pl-conc">
            {CONC.map((c, i) => (
              <li key={i}>{L(c.e, c.z)}</li>
            ))}
          </ol>
          <div className="pl-honesty mono">
            {L(
              "HONESTY BOUNDARY — N=6 · formative themes, not verified findings · deviations, instrument failures and repairs logged in the 17-entry pilot ledger · confirmatory test: preregistered 2×2, N≈48 (protocol §9)",
              "诚实边界——N=6 · 形成性主题而非验证性结论 · 偏差、仪器故障与修复全记录于 17 条试点台账 · 验证性检验：预注册 2×2，N≈48（协议 §9）"
            )}
          </div>
        </section>
      </div>

      <footer className="pl-foot mono">
        <span>GOV.AI · {L("SPECULATIVE DESIGN RESEARCH", "思辨设计研究")}</span>
        <a href="/study#sec-humans">{L("joint display", "联合展示")} ↗</a>
        <a href="/study#sec-backstage">{L("backstage", "后台剧场")} ↗</a>
        <a href="/study#sec-synthesis">{L("two kinds of visitors", "两种访客")} ↗</a>
        <span className="pl-sp" />
        <span>{L("every officer is an AI agent — given a role, never a script", "每位职员都是 AI 智能体——只给角色，从不给剧本")}</span>
      </footer>
    </main>
  );
}
