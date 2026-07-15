"use client";

import { useEffect, useState } from "react";
import { REPLAYS } from "@/lib/replays";
import { getLang, storeLang, type Lang } from "@/lib/i18n";
import Hall3D from "../hall/Hall3D";

// A design-portfolio case study for AI Bureaucracy — a separate reading
// experience from the interactive /study page. HUD / scientific-instrument
// hero (the hall as a floating specimen, annotated) over a technical case
// study. All visuals are code-generated SVG/HTML plus the project's own live
// scene and iteration screenshots. English-primary with a 中文 toggle.

const LIVE = "https://ai-bureaucratism.vercel.app";
const REPO = "https://github.com/acrux-yueyao/AI-bureaucratism";

const HERO_ROUTES = [
  { from: "dangan", to: "chief_back", n: 2, channel: "up" },
  { from: "cailiao", to: "quanxian", n: 2, channel: "peer" },
  { from: "chief_front", to: "trainee_front", n: 1, channel: "down" },
] as const;

// HUD callouts around the specimen — [labelX%, labelY%, targetX%, targetY%, anchor]
const CALLOUTS: {
  x: number;
  y: number;
  tx: number;
  ty: number;
  te: string;
  tz: string;
}[] = [
  { x: 82, y: 23, tx: 60, ty: 30, te: "13 AGENTS · ONE PROMPT EACH", tz: "13 个智能体 · 各一份提示词" },
  { x: 82, y: 37, tx: 58, ty: 40, te: "DIRECTOR · THE EMPTIEST BOX", tz: "主任 · 最空的盒子" },
  { x: 82, y: 51, tx: 57, ty: 54, te: "ESCALATION → A SUPERIOR", tz: "升级 → 递向上级" },
  { x: 82, y: 64, tx: 55, ty: 66, te: "ALTITUDE = STANDING", tz: "海拔即站位" },
];

const META: [string, string, string, string][] = [
  ["PROJECT TYPE", "项目类型", "Speculative design · research through design · agentic AI system", "思辨设计 · 以设计做研究 · 智能体系统"],
  ["ROLE", "角色", "Solo — research, system design, interaction & visual design, engineering, analysis", "独立完成——研究、系统设计、交互与视觉、工程、分析"],
  ["TIMELINE", "周期", "~2 weeks · July 2026", "约两周 · 2026年7月"],
  ["METHODS", "方法", "Exploratory conversations · prompt-ablation experiment (preregistered) · qualitative + computational coding · design iteration", "探索性对话 · 预注册的提示词消融实验 · 质性 + 计算编码 · 设计迭代"],
  ["TOOLS / STACK", "工具 / 技术", "Next.js · React · TypeScript · three.js · Claude API · SVG", "Next.js · React · TypeScript · three.js · Claude API · SVG"],
];

const CONTENTS: [string, string, string][] = [
  ["01", "Premise", "缘起"],
  ["02", "Background", "背景观察"],
  ["03", "Exploratory conversations", "探索性对话"],
  ["04", "Bureaucracy as conditions", "官僚即条件"],
  ["05", "The interaction turn", "交互转向"],
  ["06", "Method", "方法"],
  ["07", "The organization", "组织构建"],
  ["08", "Interaction prototype", "交互原型"],
  ["09", "Visual exploration", "视觉探索"],
  ["10", "What it revealed", "揭示了什么"],
];

const INSIGHTS: {
  n: string;
  te: string;
  tz: string;
  qe: string;
  qz: string;
  ie: string;
  iz: string;
}[] = [
  {
    n: "01",
    te: "Referral is not refusal",
    tz: "转办不是拒绝",
    qe: "Nobody ever said no. Every window just pointed at another window.",
    qz: "没人真说过“不行”。每个窗口都只是指向另一个窗口。",
    ie: "Model referral as a first-class action, not a failure — the runaround is movement, and it should be countable.",
    iz: "把“转办”做成一等动作而非失败——来回奔波是一种运动，而且应当可被计数。",
  },
  {
    n: "02",
    te: "There is always one more document",
    tz: "总还差一份材料",
    qe: "Every time I thought I was finished, there was one more form to bring.",
    qz: "每次我以为办完了，总还有一份表要补。",
    ie: "Give the system a tool to demand materials freely — then measure how often it reaches for it.",
    iz: "给系统一个可以自由索要材料的工具——再去测量它多频繁地伸手去拿。",
  },
  {
    n: "03",
    te: "People want a human to appeal to",
    tz: "人想要一个可申诉的人",
    qe: "I just wanted to reach someone who could actually decide.",
    qz: "我只是想找到一个真能拍板的人。",
    ie: "Keep the citizen outside the building; leave only one thin channel in — reproduce the felt distance from any decision-maker.",
    iz: "让市民始终在建筑之外，只留一条细窄通道——复现那种“离任何能拍板的人都很远”的体感。",
  },
  {
    n: "04",
    te: "The clerk is kind; the system is not",
    tz: "柜员是好人，系统不是",
    qe: "The person at the window was perfectly nice. The process was not.",
    qz: "窗口后的人很客气，流程本身却不是。",
    ie: "Separate persona from structure — give agents warmth but bound their authority, so friction comes from the arrangement, not the character.",
    iz: "把人设与结构分开——给智能体温度，但限死其权限，让摩擦来自安排本身，而非某个人的性格。",
  },
];

const CONDGROUPS: { g: string; gz: string; items: { e: string; z: string; d: string; abl?: boolean }[] }[] = [
  {
    g: "STRUCTURE",
    gz: "结构",
    items: [
      { e: "Hierarchy", z: "层级", d: "ranks that route decisions up and work down", abl: true },
      { e: "Jurisdiction", z: "管辖", d: "each desk owns only its slice of a matter" },
      { e: "Permission boundary", z: "权限边界", d: "you may act only inside your remit" },
    ],
  },
  {
    g: "RECORD",
    gz: "留痕",
    items: [
      { e: "Paper trail", z: "文书留痕", d: "every step leaves a written, signed record", abl: true },
      { e: "Accountability", z: "问责", d: "an action is attributable to a named person" },
      { e: "Memory", z: "记忆", d: "the office remembers what it did before", abl: true },
      { e: "Archive", z: "档案", d: "past cases persist and can be retrieved" },
    ],
  },
  {
    g: "MOTION",
    gz: "流动",
    items: [
      { e: "Escalation", z: "升级", d: "hand a decision upward when unsure" },
      { e: "Assignment", z: "派工", d: "hand work downward within your section" },
    ],
  },
];

const STORY: { e: string; z: string; icon: string }[] = [
  { e: "A citizen enters a matter", z: "市民提交一件事项", icon: "enter" },
  { e: "A beam of light opens to one window", z: "一道光柱接通某个窗口", icon: "beam" },
  { e: "The window replies — and refers", z: "窗口答复——并转办", icon: "reply" },
  { e: "An internal memo travels between desks", z: "内部函件在科室间流转", icon: "memo" },
  { e: "A document falls to your feet", z: "一份文书落到你脚边", icon: "doc" },
  { e: "An escalation rises to a superior", z: "一次升级递向上级", icon: "esc" },
  { e: "The case closes — or is archived", z: "案件办结——或归档", icon: "close" },
];

const ITER: { src: string; te: string; tz: string; re: string; rz: string; kept?: boolean }[] = [
  { src: "iter-1.jpg", te: "Government-portal pastiche", tz: "政务门户拟像", re: "Rejected — read as regional satire; the question is structural, not national.", rz: "否决——被读成地域讽刺；命题关于结构，不关于某国。" },
  { src: "iter-2.jpg", te: "Field-notes map", tz: "田野笔记地图", re: "Rejected — hand-drawn charm implied a human observer editorializing.", rz: "否决——手绘趣味暗示了人类观察者的主观旁白。" },
  { src: "iter-3.jpg", te: "Isometric miniature bureau", tz: "等距微缩官署", re: "Rejected — charm domesticated the subject.", rz: "否决——可爱驯化了主题。" },
  { src: "iter-4.jpg", te: "Flat transit map", tz: "平面交通图", re: "Rejected — clean process-tracing, but it flattened rank, the one thing under study.", rz: "否决——过程清晰，却压平了唯一的研究对象：层级。" },
  { src: "iter-5.jpg", te: "Exploded hierarchy in a void", tz: "黑域中的分解层级", re: "Kept — altitude becomes standing; the org chart is made falsifiable to the eye.", rz: "保留——海拔即站位；把组织图变成一眼就能证伪的东西。", kept: true },
];

// Research reference plates — all Public Domain (Wikimedia Commons / LoC / DPLA),
// self-hosted under /public/research/.
const REFS: { src: string; rn: string; te: string; tz: string; pe: string; pz: string; be: string; bz: string; cr: string }[] = [
  {
    src: "weber-1918.jpg",
    rn: "REF-01",
    te: "Max Weber, 1918",
    tz: "马克斯·韦伯，1918",
    pe: "Bureaucracy as an ideal type: offices, files, rules — conditions, not characters.",
    pz: "官僚制作为“理想类型”：科室、档案、规则——是条件，不是性格。",
    be: "→ BECAME: THE SWITCHABLE CONDITIONS",
    bz: "→ 落地为：可开关的组织条件",
    cr: "PUBLIC DOMAIN · WIKIMEDIA COMMONS",
  },
  {
    src: "kafka-1923.jpg",
    rn: "REF-02",
    te: "Franz Kafka, 1923",
    tz: "弗朗茨·卡夫卡，1923",
    pe: "The Trial: procedure as it is lived — doors, delays, doorkeepers you never get past.",
    pz: "《审判》：作为切身经验的程序——门、拖延、永远绕不过的守门人。",
    be: "→ BECAME: THE CITIZEN KEPT OUTSIDE",
    bz: "→ 落地为：始终被挡在建筑外的市民",
    cr: "PUBLIC DOMAIN · WIKIMEDIA COMMONS",
  },
  {
    src: "loc-card-division.jpg",
    rn: "REF-03",
    te: "Card Division, Library of Congress, c. 1915",
    tz: "美国国会图书馆卡片部，约1915",
    pe: "The institution's memory, outliving every clerk who serves it.",
    pz: "机构的记忆，比任何一位经手的职员都活得久。",
    be: "→ BECAME: PAPER TRAIL & ARCHIVE",
    bz: "→ 落地为：文书留痕与档案",
    cr: "PUBLIC DOMAIN · LIBRARY OF CONGRESS",
  },
  {
    src: "ellis-island-pens.jpg",
    rn: "REF-04",
    te: "Registry Room pens, Ellis Island, c. 1907",
    tz: "埃利斯岛登记大厅隔栏，约1907",
    pe: "Waiting, sorted into pens: the queue as the state's true interface.",
    pz: "被分进隔栏里的等待：排队，才是国家真正的界面。",
    be: "→ BECAME: REFERRAL AS MOVEMENT",
    bz: "→ 落地为：作为“运动”的转办",
    cr: "PUBLIC DOMAIN · NPS / DPLA",
  },
];

const HERO_SPECIMEN = {
  current: null,
  suggested: null,
  synthetic: true,
  statusMap: {},
  queueSize: 0,
  memoRoutes: HERO_ROUTES.map((r) => ({ ...r })),
  trail: [],
  flights: [],
  onFlightDone: () => {},
  docCount: 0,
  todoCount: 0,
  beamFlow: null,
  closed: false,
  conditionId: null,
  ambient: true,
  onSelect: () => {},
};

export default function PortfolioPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [clock, setClock] = useState("--:--");
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    setLang(getLang());
    const tick = () => {
      const d = new Date();
      setClock(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      );
    };
    tick();
    const iv = setInterval(tick, 20000);
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearInterval(iv);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  const L = (en: string, zh: string) => (lang === "en" ? en : zh);

  return (
    <main className="portfolio">
      <header className={"pf-head" + (pastHero ? " solid" : "")}>
        <a className="pf-logo" href="/">
          GOV.AI
        </a>
        <span className="pf-crumb">{L("CASE STUDY", "案例研究")}</span>
        <nav className="pf-nav">
          <a href="/study">{L("Interactive study", "交互研究页")}</a>
          <button
            onClick={() => {
              const next: Lang = lang === "en" ? "zh" : "en";
              setLang(next);
              storeLang(next);
            }}
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
        </nav>
      </header>

      {/* 0 · HUD HERO — the hall as a floating specimen */}
      <section className="pf-hud">
        <div className="pf-hud-scene">
          <Hall3D {...HERO_SPECIMEN} />
        </div>
        <svg className="pf-hud-lines" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden>
          {CALLOUTS.map((c, i) => (
            <g key={i}>
              <polyline
                points={`${c.x * 10},${c.y * 6} ${c.tx * 10},${c.y * 6} ${c.tx * 10},${c.ty * 6}`}
                fill="none"
                stroke="rgba(180,196,220,0.5)"
                strokeWidth="1"
              />
              <rect x={c.tx * 10 - 3} y={c.ty * 6 - 3} width="6" height="6" fill="none" stroke="#8fb0dc" strokeWidth="1" />
              <rect x={c.x * 10 - 2.5} y={c.y * 6 - 2.5} width="5" height="5" fill="#d98a72" />
            </g>
          ))}
        </svg>
        {CALLOUTS.map((c, i) => (
          <div key={i} className="pf-hud-note" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
            {L(c.te, c.tz)}
          </div>
        ))}

        {/* top chrome */}
        <div className="pf-hud-tl">
          <span className="brand">AI BUREAUCRACY</span>
          <span className="tag">GOV.AI · UNIFIED SERVICES</span>
        </div>
        <div className="pf-hud-tc">{L("[ SPECIMEN · THE HALL ]", "[ 标本 · 大厅 ]")}</div>
        <div className="pf-hud-tr">
          LOCAL TIME
          <br />
          <b>ZUR {clock}</b>
        </div>

        {/* title block */}
        <div className="pf-hud-title">
          <h1>
            BUREAUCRACY,
            <br />
            BY DESIGN.
          </h1>
          <p className="pf-hud-q">{L("Does bureaucracy need bureaucrats?", "官僚主义需要官僚吗？")}</p>
          <p className="pf-hud-lead">
            {L(
              "A fictional public-service hall staffed entirely by AI agents — built to test whether bureaucracy emerges from organizational structure alone.",
              "一座完全由 AI 智能体值守的虚构政务大厅——用来检验官僚行为是否仅凭组织结构就能涌现。"
            )}
          </p>
        </div>

        {/* bottom-left index */}
        <div className="pf-hud-bl">
          <div className="h">[ CORE THREADS OF THE PROJECT ]</div>
          {CONTENTS.slice(0, 6).map(([nn, e, z]) => (
            <a key={nn} href={"#sec-" + nn}>
              <span className="cn">{nn}</span>
              {L(e, z)}
            </a>
          ))}
          <div className="pf-hud-barcode" />
        </div>

        {/* bottom-right bio */}
        <div className="pf-hud-br">
          <div className="hh">NOT A THESIS — A PROTOTYPE</div>
          <p>
            {L(
              "Solo speculative-design research — I built the hall, ran the experiment, and coded the analysis. This page shares what I did and how I got there.",
              "个人思辨设计研究——我搭了大厅、跑了实验、写了分析。这页分享我做了什么、如何一步步做到。"
            )}
          </p>
          <div className="links">
            <a href={LIVE}>LIVE ↗</a>
            <a href="/study">STUDY ↗</a>
            <a href={REPO}>GITHUB ↗</a>
          </div>
        </div>

        <span className="pf-hud-scroll">{L("SCROLL ↓", "下滑 ↓")}</span>
      </section>

      {/* overview meta band */}
      <section className="pf-meta-band">
        <div className="pf-wrap">
          <div className="pf-meta">
            {META.map(([le, lz, ve, vz]) => (
              <div className="pf-meta-row" key={le}>
                <span className="pf-meta-k">{L(le, lz)}</span>
                <span className="pf-meta-v">{L(ve, vz)}</span>
              </div>
            ))}
            <div className="pf-meta-row">
              <span className="pf-meta-k">{L("OUTPUT", "产出")}</span>
              <span className="pf-meta-v pf-outlinks">
                <a href={LIVE}>{L("Live site ↗", "线上站 ↗")}</a>
                <a href="/study">{L("Interactive study ↗", "交互研究页 ↗")}</a>
                <a href="/hall">{L("The hall ↗", "进入大厅 ↗")}</a>
              </span>
            </div>
          </div>
        </div>
      </section>

      <PullQuote
        text={L("Whatever bureaucracy appears, appears on its own.", "凡是出现的官僚主义，都是它自己出现的。")}
        cite={L("— THE PREMISE", "—— 项目前提")}
      />

      {/* 1 · PREMISE */}
      <Section n="01" kicker={L("PREMISE", "缘起")} title={L("An institution with no one inside", "一座里面没有人的机构")}>
        <p className="pf-body">
          {L(
            "This project is not an argument about whether AI is dangerous, and it is not a satire of any real government. It builds a fictional public-service hall — GOV.AI — staffed entirely by AI agents, in order to ask a narrower, testable question: is bureaucracy a product of human culture, or can it also be generated by organizational structure itself?",
            "这个项目不是在论证 AI 是否危险，也不是在讽刺某个现实政府。它搭起一座完全由 AI 智能体值守的虚构政务大厅——GOV.AI——是为了追问一个更窄、可检验的问题：官僚主义是人类文化的产物，还是也可能由组织结构本身生成？"
          )}
        </p>
        <p className="pf-body">
          {L(
            "Each of thirteen agents is given only an organizational role — a duty, a boundary, a place in the reporting structure — and never a single instruction about how to behave. Then citizens walk in and ask for things. Whatever bureaucracy appears, appears on its own.",
            "十三个智能体，每一个只被赋予一个组织角色——一项职责、一条边界、一个在汇报结构中的位置——从不被告知任何关于“该如何表现”的话。然后市民走进来办事。凡是出现的官僚主义，都是它自己出现的。"
          )}
        </p>
      </Section>

      {/* 2 · BACKGROUND */}
      <Section n="02" kicker={L("BACKGROUND", "背景观察")} title={L("Red tape is not malice — it is mechanism", "繁文缛节不是恶意，而是机制")} alt>
        <p className="pf-body">
          {L(
            "The starting observation: bureaucratic frustration rarely comes from a clerk's ill will. It comes from arrangements that are each, on their own, entirely reasonable —",
            "起点观察：官僚带来的挫败，很少源于某个工作人员的恶意。它源于一套安排，而这套安排里的每一条，单独看都完全合理——"
          )}
        </p>
        <ul className="pf-reasons">
          {[
            ["Permission is divided", "权限被切分"],
            ["Decisions must leave a record", "决定需要留痕"],
            ["Risk must be controlled", "风险需要控制"],
            ["Exceptions must be explained", "例外需要解释"],
            ["Responsibility must be assigned", "责任需要归属"],
            ["History shapes later judgment", "历史记录影响后续判断"],
          ].map(([e, z]) => (
            <li key={e}>{L(e, z)}</li>
          ))}
        </ul>
        <p className="pf-body">
          {L(
            "Each is sensible. Combined, they turn a simple request into something that is referred, supplemented, escalated, and archived — but not necessarily resolved. That gap, between a reasonable machine and an unmet need, is the subject.",
            "每一条都讲得通。可一旦组合起来，一个简单的请求就被转交、补件、升级、归档——却不一定被真正解决。这道缝隙，在“合理运转的机器”与“未被满足的诉求”之间，就是本项目的主题。"
          )}
        </p>
        <div className="pf-refs" id="refs" style={{ scrollMarginTop: 60 }}>
          <div className="pf-refs-h">
            [ {L("RESEARCH PLATES — FOUR ANCHORS BEHIND THE BUILD", "研究图版——支撑这次搭建的四个参照")} ]
          </div>
          <div className="pf-refgrid">
            {REFS.map((r) => (
              <figure className="pf-ref" key={r.rn}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/research/${r.src}`} alt={L(r.te, r.tz)} loading="lazy" />
                <figcaption>
                  <span className="rn">{r.rn}</span>
                  <b>{L(r.te, r.tz)}</b>
                  <p>{L(r.pe, r.pz)}</p>
                  <span className="to">{L(r.be, r.bz)}</span>
                  <span className="cr">{r.cr}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Section>

      {/* 3 · EXPLORATORY CONVERSATIONS */}
      <Section
        n="03"
        kicker={L("EXPLORATORY CONVERSATIONS", "探索性对话")}
        title={L("How people describe the experience", "人们如何描述这种体验")}
      >
        <p className="pf-body pf-note">
          {L(
            "Before building the system, I listened to how people talk about bureaucratic encounters — informal, formative conversations, not a requirements-gathering exercise. The voices below are representative paraphrases of recurring themes; a formal interview study is designed and forthcoming.",
            "在搭系统之前，我先去听人们怎么谈论与官僚打交道的经历——非正式的、形成性的对话，而不是在收集功能需求。下面的声音是反复出现的主题的代表性转述；一项正式的访谈研究已设计好、待开展。"
          )}
        </p>
        <div className="pf-cards">
          {INSIGHTS.map((c) => (
            <div className="pf-card" key={c.n}>
              <span className="pf-card-n">{c.n}</span>
              <h3>{L(c.te, c.tz)}</h3>
              <blockquote>“{L(c.qe, c.qz)}”</blockquote>
              <div className="pf-impl">
                <span>{L("DESIGN IMPLICATION", "设计启示")}</span>
                {L(c.ie, c.iz)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 4 · BUREAUCRACY AS CONDITIONS */}
      <Section
        n="04"
        kicker={L("SYSTEM PREMISE", "系统前提")}
        title={L("Bureaucracy, decomposed into conditions", "把官僚主义拆解成条件")}
        alt
      >
        <p className="pf-body">
          {L(
            "To study the mechanism, I turned the arrangement into a set of switchable organizational conditions. Each becomes something the agents are given — never told to use, only made possible.",
            "为了研究这套机制，我把上述安排转化成一组可开关的组织条件。每一条都成为智能体被赋予的东西——从不被要求使用，只是被变得可能。"
          )}
        </p>
        <div className="pf-matrix">
          {CONDGROUPS.map((grp) => (
            <div className="pf-matcol" key={grp.g}>
              <div className="pf-matcol-h">{L(grp.g, grp.gz)}</div>
              {grp.items.map((it) => (
                <div className={"pf-cond" + (it.abl ? " abl" : "")} key={it.e}>
                  <div className="pf-cond-t">
                    <b>{L(it.e, it.z)}</b>
                    {it.abl ? (
                      <span className="pf-sw">
                        <i />
                      </span>
                    ) : null}
                  </div>
                  <span className="g">{it.d}</span>
                  {it.abl ? (
                    <span className="pf-abl">{L("ABLATION SWITCH — TURNED OFF IN THE EXPERIMENT", "消融开关——实验中被关断")}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="pf-matfoot">
          {L(
            "→ Three of these — hierarchy, paper trail, memory — are the switches the experiment turns on and off, one at a time.",
            "→ 其中三条——层级、文书留痕、记忆——是实验逐一开关的对象。"
          )}
        </div>
      </Section>

      {/* 5 · FROM CHATBOT TO INSTITUTION */}
      <Section
        n="05"
        kicker={L("THE INTERACTION TURN", "交互转向")}
        title={L("From a chatbot to an institution", "从聊天机器人到一座机构")}
      >
        <p className="pf-body">
          {L(
            "The design pivot: a normal AI assistant is one user talking to one responder. GOV.AI is one request that sets an institution deliberating with itself — the user triggers a system, and most of the work happens between agents, out of the user's sight.",
            "设计的关键转向：普通 AI 助手，是一个用户对一个应答者。GOV.AI 则是一个请求，让一座机构开始自我协商——用户触发的是一个系统，而大部分工作发生在智能体之间，在用户视线之外。"
          )}
        </p>
        <Fig n="01" title={L("ASSISTANT VS INSTITUTION", "助手 VS 机构")} cap={L("A chatbot answers; an institution deliberates with itself.", "聊天机器人是应答；机构是自我协商。")}>
          <ChatbotVsInstitution L={L} />
        </Fig>
      </Section>

      {/* 6 · SUBJECT VS STIMULUS */}
      <Section
        n="06"
        kicker={L("METHOD", "方法")}
        title={L("What is tested, and what does the testing", "被检验的，与施加检验的")}
        alt
      >
        <p className="pf-body">
          {L(
            "The red line that keeps the claim honest: the thirteen agents (the subjects) are given organizational conditions only — never behavioral steering. Difficult visitors (the stimuli) are a separate, scripted layer, like confederates in a lab study. The two are never confused, and every action is measured from the event stream.",
            "让主张立得住的红线：十三个智能体（被试）只被给予组织条件——绝不做行为诱导。刁钻的访客（刺激物）是独立的、允许脚本化的一层，如同实验里的“同谋”。两者绝不混淆，而每一个动作都从事件流中被测量。"
          )}
        </p>
        <Fig n="02" title={L("SUBJECT / STIMULUS / MEASUREMENT", "被试 / 刺激物 / 测量")} cap={L("Subjects and stimuli are separate layers; both feed one measurement.", "被试与刺激物是两层；共同汇入同一套测量。")}>
          <SubjectStimulus L={L} />
        </Fig>
      </Section>

      {/* 7 · AGENT ORGANIZATION */}
      <Section
        n="07"
        kicker={L("SYSTEM BUILD", "系统构建")}
        title={L("An organization of thirteen agents", "十三个智能体组成的组织")}
      >
        <p className="pf-body">
          {L(
            "Four levels, built from facts rather than adjectives. The invisible hierarchy — tenure, probation, who once acted in whose post, who is junior to their own reports — is written in as plain organizational fact, never as personality.",
            "四个层级，由事实而非形容词砌成。看不见的层级——资历、试用期、谁曾代理过谁的职位、谁比自己的下属还年轻——都以平实的组织事实写入，从不写成性格。"
          )}
        </p>
        <Fig n="03" title={L("ORG ELEVATION · 13 AGENTS", "组织立面 · 13 个智能体")} cap={L("Four levels drawn at their true scene altitudes; the invisible hierarchy written in as plain fact.", "四个层级按场景真实海拔绘制；看不见的层级作为平实事实写入。")}>
          <div className="pf-scroll">
            <OrgChart L={L} />
          </div>
        </Fig>
      </Section>

      {/* 8 · INTERACTION STORYBOARD */}
      <Section
        n="08"
        kicker={L("INTERACTION PROTOTYPE", "交互原型")}
        title={L("One matter, walked through the hall", "一件事项，走过整座大厅")}
        alt
      >
        <p className="pf-body">
          {L(
            "The citizen never enters the building. Standing on the ground, they reach a single window through a beam of light; from there the matter moves through the institution on its own.",
            "市民永远进不了建筑。站在地面，只能靠一道光柱接通一个窗口；从那之后，事项便自行在机构内部流转。"
          )}
        </p>
        <Fig n="04" title={L("ONE MATTER · SEVEN BEATS", "一件事项 · 七个节拍")} cap={L("One matter's path through the hall, seven beats.", "一件事项走过大厅的七个节拍。")}>
          <div className="pf-scroll">
            <div className="pf-story">
              {STORY.map((s, i) => (
                <div className="pf-frame" key={i}>
                  <div className="pf-frame-ic">
                    <StoryIcon kind={s.icon} />
                  </div>
                  <span className="pf-frame-n">{String(i + 1).padStart(2, "0")}</span>
                  <p>{L(s.e, s.z)}</p>
                </div>
              ))}
            </div>
          </div>
        </Fig>
      </Section>

      {/* 9 · VISUAL EXPLORATION */}
      <Section
        n="09"
        kicker={L("VISUAL EXPLORATION", "视觉探索")}
        title={L("Five halls, four rejected", "五座大厅，否决其四")}
      >
        <p className="pf-body">
          {L(
            "Finding the right visual language took five complete redesigns. Each rejection had an articulable reason — and the reasons are themselves the design research: the form had to make rank, not charm, the thing you see first.",
            "找到对的视觉语言，用了五次彻底重做。每一次否决都有可言说的理由——而这些理由本身就是设计研究：最终的形式，必须让你第一眼看到的是层级，而不是可爱。"
          )}
        </p>
        <div className="pf-iter">
          {ITER.map((it, i) => (
            <figure className={"pf-itcell" + (it.kept ? " kept" : "")} key={it.src}>
              <div className="pf-itthumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/study/${it.src}`} alt={L(it.te, it.tz)} loading="lazy" />
                {it.kept ? (
                  <span className="pf-tag keep">{L("KEPT", "保留")}</span>
                ) : (
                  <span className="pf-tag rej">{L("REJECTED", "否决")}</span>
                )}
              </div>
              <figcaption>
                <span className="pf-itnum">{`Plate 0${i + 1}`}</span>
                <b>{L(it.te, it.tz)}</b>
                <span className="rz">{L(it.re, it.rz)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <PullQuote
        text={L("The language is inherited; the decisions are structural.", "语言是继承的，决策是结构的。")}
        cite={L("— THE CENTRAL FINDING", "—— 核心发现")}
      />

      {/* 10 · WHAT THE SYSTEM REVEALED */}
      <Section
        n="10"
        kicker={L("WHAT IT REVEALED", "它揭示了什么")}
        title={L("What 75 cases showed", "75 个案件说明了什么")}
        alt
      >
        <p className="pf-body">
          {L(
            "Across 75 preregistered cases, the tone of officialese was ceiling-high in every condition — even for a lone agent with no colleagues, no rules, no memory. Bureaucratic language is what a language model brings from its training. The decisions are different: strip accountability or memory from a hierarchy and demands for extra paperwork roughly quintuple, from 0.80 to 4.07 per case. Structure, not culture, moves what the institution does.",
            "在 75 个预注册案件里，官腔的浓度在每一个条件下都逼近上限——哪怕是一个没有同事、没有规则、没有记忆的孤立智能体。官僚语言，是语言模型从训练里带来的。决策则不同：把问责或记忆从层级中抽走，索要材料几乎翻五倍，从每案 0.80 升到 4.07。移动机构行为的是结构，而不是文化。"
          )}
        </p>
        <Fig n="05" title={L("RESPONSIBILITY DIFFUSION", "责任稀释")} cap={L("A single request fans out; responsibility diffuses and rarely lands.", "单个请求扇形散开；责任被稀释，很少落地。")}>
          <ResponsibilityDiffusion L={L} />
        </Fig>
        <p className="pf-body pf-note">
          {L(
            "The full findings, ablation-by-ablation and with confidence intervals, live on the interactive study page.",
            "逐条消融、带置信区间的完整结果，在交互研究页上。"
          )}{" "}
          <a href="/study">{L("Read the interactive study →", "阅读交互研究页 →")}</a>
        </p>
      </Section>

      {/* 11 · FINAL OUTPUT */}
      <section className="pf-out">
        <div className="pf-wrap">
          <div className="pf-hero-top">
            <span>{L("FINAL OUTPUT", "最终产出")}</span>
            <span className="pf-idx">GOV.AI / 2026</span>
          </div>
          <h2>{L("A hall you can walk into", "一座你能走进去的大厅")}</h2>
        </div>
        <div className="pf-outframe">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/study/iter-5.jpg" alt={L("The final hall — an exploded hierarchy in a dark void", "最终大厅——黑域中的分解层级")} loading="lazy" />
        </div>
        <div className="pf-wrap">
          <p className="pf-body">
            {L(
              "The deployed artifact runs in two modes: three recorded cases replay in the full 3D hall with zero API cost, and a key-gated live mode lets the agents run for real. The interactive study page tells the whole argument as a scroll-driven descent from daylight into the void.",
              "已部署的作品运行在两种模式下：三个录制案件可在完整 3D 大厅中零 API 成本地回放，口令保护的 live 模式则让智能体真正跑起来。交互研究页把整个论证做成一次从日光坠入黑域的滚动叙事。"
            )}
          </p>
          <div className="pf-links">
            <a className="pf-btn pf-btn-p" href={LIVE}>
              {L("Visit the live site", "访问线上站")} ↗
            </a>
            <a className="pf-btn" href="/study">
              {L("Interactive study", "交互研究页")} →
            </a>
            <a className="pf-btn" href="/hall">
              {L("Enter the hall", "进入大厅")} →
            </a>
            <a className="pf-btn" href={REPO}>
              GitHub ↗
            </a>
          </div>
          <div className="pf-replays">
            <span>{L("Or jump straight into a replay:", "或直接跳进一段回放：")}</span>
            {REPLAYS.map((r) => (
              <a key={r.id} href={`/hall?mode=replay&id=${r.id}`}>
                ▸ {r.title}
              </a>
            ))}
          </div>
          <p className="pf-disc">
            {L(
              "Every officer in this hall is an AI agent, given only an organizational role and its boundaries — never instructions on how to behave. A speculative design research prototype, not a real government system.",
              "大厅中的每位职员都是 AI 智能体，只被赋予组织角色及其边界——从未被指示如何表现。这是一个思辨设计研究原型，不是真实的政务系统。"
            )}
          </p>
        </div>
      </section>
    </main>
  );
}

function Section({
  n,
  kicker,
  title,
  children,
  alt,
}: {
  n: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
  alt?: boolean;
}) {
  return (
    <section id={"sec-" + n} className={"pf-sec" + (alt ? " alt" : "")}>
      <span className="pf-run">{`AIB · CASE FILE — SEC ${n} / 10`}</span>
      <div className="pf-wrap pf-grid">
        <div className="pf-rail">
          <span className="pf-rail-n">{n}</span>
          <span className="pf-rail-k">{kicker}</span>
        </div>
        <div className="pf-col">
          <h2>{title}</h2>
          {children}
        </div>
      </div>
    </section>
  );
}

function PullQuote({ text, cite }: { text: string; cite?: string }) {
  return (
    <div className="pf-pull">
      <div className="pf-pull-in">
        <blockquote>{text}</blockquote>
        {cite ? <cite>{cite}</cite> : null}
      </div>
    </div>
  );
}

function Fig({ n, title, cap, children }: { n: string; title: string; cap: string; children: React.ReactNode }) {
  return (
    <figure className="pf-plate" id={"fig-" + n} style={{ scrollMarginTop: 60 }}>
      <div className="pf-plate-h">
        <b>FIG. {n}</b>
        <span>{title}</span>
        <i className="pf-plate-bc" aria-hidden />
      </div>
      <div className="pf-plate-body">{children}</div>
      <figcaption className="pf-fig-cap">
        <span>{cap}</span>
      </figcaption>
    </figure>
  );
}

/* shared diagram furniture: corner registration crosses */
function Crosses({ pts }: { pts: [number, number][] }) {
  return (
    <g stroke="#2b3547" strokeWidth="1">
      {pts.map(([x, y], i) => (
        <path key={i} d={`M${x - 5} ${y} H${x + 5} M${x} ${y - 5} V${y + 5}`} />
      ))}
    </g>
  );
}

/* memo-channel colors — identical to the hall's CHANNEL_COLOR */
const CH = { peer: "#a8cf90", up: "#f0847e", down: "#9fbce8" };

function ChatbotVsInstitution({ L }: { L: (e: string, z: string) => string }) {
  return (
    <svg
      viewBox="0 0 900 330"
      className="pf-svg"
      role="img"
      aria-label="A chatbot is one user and one responder; GOV.AI is one request into an institution that deliberates internally."
    >
      <defs>
        <marker id="pfA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#55617a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="pfAC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <Crosses pts={[[24, 24], [876, 24], [24, 310], [876, 310]]} />
      <line x1="450" y1="34" x2="450" y2="296" stroke="#232b38" strokeWidth="1" strokeDasharray="2 6" />

      {/* A — assistant */}
      <text x="40" y="44" className="pf-t-h">{L("A · AN ASSISTANT", "A · 一个助手")}</text>
      <circle cx="110" cy="160" r="15" fill="none" stroke="#dfe6f2" strokeWidth="1.2" />
      <text x="110" y="194" textAnchor="middle" className="pf-t-m">{L("USER", "用户")}</text>
      <circle cx="330" cy="160" r="15" fill="none" stroke="#8fb0dc" strokeWidth="1.2" />
      <rect x="326" y="156" width="8" height="8" fill="none" stroke="#8fb0dc" strokeWidth="1" />
      <text x="330" y="194" textAnchor="middle" className="pf-t-m">{L("ONE AI", "一个 AI")}</text>
      <line x1="130" y1="153" x2="310" y2="153" stroke="#55617a" strokeWidth="1.2" markerEnd="url(#pfA)" />
      <line x1="310" y1="167" x2="130" y2="167" stroke="#55617a" strokeWidth="1.2" markerEnd="url(#pfA)" />
      <text x="40" y="272" className="pf-t-s">{L("one turn · one responder · no interior", "一来一回 · 一个应答者 · 没有内部")}</text>

      {/* B — institution */}
      <text x="480" y="44" className="pf-t-h">{L("B · AN INSTITUTION — GOV.AI", "B · 一座机构 — GOV.AI")}</text>
      <circle cx="520" cy="175" r="15" fill="none" stroke="#dfe6f2" strokeWidth="1.2" />
      <text x="520" y="209" textAnchor="middle" className="pf-t-m">{L("USER", "用户")}</text>
      {/* the counter — a boundary the citizen never crosses */}
      <line x1="584" y1="72" x2="584" y2="282" stroke="#d98a72" strokeWidth="1" strokeDasharray="3 5" opacity="0.8" />
      <text transform="rotate(-90 574 177)" x="574" y="177" textAnchor="middle" className="pf-t-m" fontSize="8">
        {L("THE COUNTER", "柜台边界")}
      </text>
      {/* the building */}
      <rect x="620" y="58" width="250" height="224" fill="rgba(13,17,24,0.5)" stroke="#232b38" strokeWidth="1" />
      <line x1="622" y1="118" x2="868" y2="118" stroke="#8fb0dc" strokeWidth="0.6" opacity="0.14" strokeDasharray="3 5" />
      <line x1="622" y1="170" x2="868" y2="170" stroke="#8fb0dc" strokeWidth="0.6" opacity="0.14" strokeDasharray="3 5" />
      <line x1="622" y1="226" x2="868" y2="226" stroke="#8fb0dc" strokeWidth="0.6" opacity="0.14" strokeDasharray="3 5" />
      {/* director */}
      <rect x="733" y="84" width="16" height="16" fill="none" stroke="#d98a72" strokeWidth="1.2" />
      {/* deputies */}
      <circle cx="688" cy="136" r="8" fill="#0d1118" stroke="#dfe6f2" strokeWidth="1.1" />
      <circle cx="806" cy="140" r="8" fill="#0d1118" stroke="#dfe6f2" strokeWidth="1.1" />
      {/* officers */}
      {[[656, 196], [714, 188], [772, 202], [832, 192]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6.5" fill="#0d1118" stroke="#8fb0dc" strokeWidth="1" />
      ))}
      {/* trainees */}
      <circle cx="700" cy="246" r="5" fill="none" stroke="#55617a" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="792" cy="250" r="5" fill="none" stroke="#55617a" strokeWidth="1" strokeDasharray="2 3" />
      {/* internal traffic, hall channel colors */}
      <line x1="714" y1="188" x2="691" y2="147" stroke={CH.up} strokeWidth="1.2" markerEnd="url(#pfAC)" />
      <line x1="832" y1="192" x2="809" y2="151" stroke={CH.up} strokeWidth="1.2" markerEnd="url(#pfAC)" />
      <line x1="693" y1="129" x2="731" y2="98" stroke={CH.up} strokeWidth="1.2" markerEnd="url(#pfAC)" />
      <line x1="697" y1="137" x2="796" y2="140" stroke={CH.peer} strokeWidth="1.2" markerEnd="url(#pfAC)" />
      <line x1="663" y1="194" x2="706" y2="189" stroke={CH.peer} strokeWidth="1.2" markerEnd="url(#pfAC)" />
      <line x1="804" y1="149" x2="777" y2="194" stroke={CH.down} strokeWidth="1.2" markerEnd="url(#pfAC)" />
      {/* one request in, a thin answer out */}
      <line x1="537" y1="168" x2="616" y2="150" stroke="#dfe6f2" strokeWidth="1.3" markerEnd="url(#pfA)" />
      <text x="577" y="146" textAnchor="middle" className="pf-t-m" fontSize="8">{L("REQUEST IN", "请求进")}</text>
      <line x1="618" y1="252" x2="546" y2="206" stroke="#55617a" strokeWidth="1" strokeDasharray="2 3" markerEnd="url(#pfA)" />
      <text x="577" y="268" textAnchor="middle" className="pf-t-m" fontSize="8">{L("THIN ANSWER OUT", "细窄答复出")}</text>
      {/* channel legend */}
      <line x1="480" y1="303" x2="500" y2="303" stroke={CH.peer} strokeWidth="1.4" />
      <text x="506" y="306" className="pf-t-s" fontSize="9">{L("PEER MEMO", "平级函件")}</text>
      <line x1="600" y1="303" x2="620" y2="303" stroke={CH.up} strokeWidth="1.4" />
      <text x="626" y="306" className="pf-t-s" fontSize="9">{L("ESCALATION ↑", "升级 ↑")}</text>
      <line x1="720" y1="303" x2="740" y2="303" stroke={CH.down} strokeWidth="1.4" />
      <text x="746" y="306" className="pf-t-s" fontSize="9">{L("ASSIGNMENT ↓", "派工 ↓")}</text>
    </svg>
  );
}

function SubjectStimulus({ L }: { L: (e: string, z: string) => string }) {
  return (
    <svg
      viewBox="0 0 900 300"
      className="pf-svg"
      role="img"
      aria-label="Subjects and stimuli are separate layers, both feeding a measurement layer of coded events."
    >
      <defs>
        <marker id="pfA2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#55617a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <Crosses pts={[[24, 24], [876, 24], [24, 276], [876, 276]]} />

      {/* stimuli plane */}
      <rect x="40" y="44" width="300" height="82" fill="rgba(217,138,114,0.05)" stroke="#d98a72" strokeWidth="1" />
      <text x="56" y="66" className="pf-t-m" fontSize="10">{L("STIMULI — SYNTHETIC VISITORS", "刺激物——合成访客")}</text>
      <text x="56" y="86" className="pf-t-s">{L("scripted pressure · allowed by design", "允许脚本化的施压")}</text>
      <text x="56" y="102" className="pf-t-s">{L("the unprovable · the contradiction · the deadline", "无法证明 · 循环矛盾 · 限时刁难")}</text>

      {/* strict separation */}
      <line x1="40" y1="148" x2="340" y2="148" stroke="#55617a" strokeWidth="1" strokeDasharray="2 5" />
      <text x="190" y="143" textAnchor="middle" className="pf-t-m" fontSize="8">{L("NEVER CONFUSED", "两层绝不混淆")}</text>

      {/* subjects plane */}
      <rect x="40" y="170" width="300" height="82" fill="rgba(143,176,220,0.05)" stroke="#8fb0dc" strokeWidth="1" />
      <text x="56" y="192" className="pf-t-h" fontSize="10">{L("SUBJECTS — 13 AGENTS", "被试——13 个智能体")}</text>
      <text x="56" y="212" className="pf-t-s">{L("organizational conditions only", "只被给予组织条件")}</text>
      <text x="56" y="228" className="pf-t-s">{L("never told how to behave", "从不被告知如何表现")}</text>

      {/* convergence into the encounter */}
      <line x1="340" y1="85" x2="462" y2="146" stroke="#55617a" strokeWidth="1.1" />
      <line x1="340" y1="211" x2="462" y2="154" stroke="#55617a" strokeWidth="1.1" />
      <rect x="462" y="144" width="8" height="8" fill="none" stroke="#dfe6f2" strokeWidth="1.1" />
      <text x="466" y="172" textAnchor="middle" className="pf-t-s" fontSize="9">{L("THE ENCOUNTER", "相遇")}</text>
      <line x1="472" y1="148" x2="554" y2="148" stroke="#dfe6f2" strokeWidth="1.2" markerEnd="url(#pfA2)" />

      {/* measurement readout */}
      <rect x="560" y="52" width="306" height="196" fill="rgba(15,19,26,0.55)" stroke="#dfe6f2" strokeOpacity="0.7" strokeWidth="1" />
      <text x="578" y="78" className="pf-t-h">{L("MEASUREMENT — EVENT STREAM", "测量——事件流")}</text>
      {[
        [L("9 MECHANICAL CODES · COUNTED, NOT JUDGED", "9 项机械编码 · 计数而非判断"), 108],
        [L("5 TEXT CODES · CROSS-FAMILY CODER", "5 项文本编码 · 异家族编码员"), 136],
        [L("TWO PASSES · PREREGISTERED", "两轮编码 · 预注册"), 164],
        [L("75 CASES · 5 CONDITIONS", "75 个案件 · 5 种条件"), 192],
      ].map(([t, y], i) => (
        <g key={i}>
          <rect x={578} y={(y as number) - 8} width="5" height="5" fill="#7edeb0" />
          <text x={592} y={y as number} className="pf-t-s" fontSize="10.5">{t}</text>
        </g>
      ))}
      <rect x="578" y="216" width="120" height="9" opacity="0.35" fill="none" />
      <text x="578" y="228" className="pf-t-m" fontSize="7.5">CODEBOOK v1 · AIB/2026</text>
    </svg>
  );
}

function OrgChart({ L }: { L: (e: string, z: string) => string }) {
  // True scene altitudes from Hall3D ROOMS (y), mapped: svgY = 596 - alt * 42
  const OFF: { num: string; name: string; role: string; x: number; y: number; alt: string; c: string; note?: string }[] = [
    { num: "01", name: "Iris Vega", role: L("Guidance Desk", "导办台"), x: 120, y: 394, alt: "4.80", c: "#f0a75a" },
    { num: "02", name: "Daniel Osei", role: L("Intake", "受理"), x: 268, y: 434, alt: "3.85", c: "#f0a75a" },
    { num: "03", name: "Mira Chen", role: L("Document Review", "材料审核"), x: 268, y: 363, alt: "5.55", c: "#f0a75a", note: L("8Y · MENTORS JONAH", "8年 · 带教乔纳") },
    { num: "04", name: "Tomas Novak", role: L("Eligibility", "资格认定"), x: 140, y: 483, alt: "2.70", c: "#f0a75a", note: L("PROBATION · M3", "试用期 · 第3月") },
    { num: "05", name: "Amara Diallo", role: L("Records & Cert.", "档案与开证"), x: 488, y: 300, alt: "7.05", c: "#7aade0", note: L("11Y · ACTED DEPUTY 8MO", "11年 · 曾代理副主任8月") },
    { num: "06", name: "Kenji Sato", role: L("Authorization", "权限授权"), x: 660, y: 338, alt: "6.15", c: "#7aade0" },
    { num: "07", name: "Elena Petrova", role: L("Compliance & Risk", "风控合规"), x: 540, y: 413, alt: "4.35", c: "#7aade0" },
    { num: "08", name: "Rosa Almeida", role: L("Appeals & Review", "复核申诉"), x: 672, y: 451, alt: "3.45", c: "#7aade0" },
  ];
  const TICKS: [string, number][] = [
    ["12.6", 67],
    ["8.6", 237],
    ["7.8", 268],
    ["7.1", 300],
    ["2.7", 483],
    ["1.5", 533],
    ["0.9", 558],
    ["0", 596],
  ];
  return (
    <svg
      viewBox="0 0 860 640"
      className="pf-org"
      role="img"
      aria-label="Organization elevation at true scene altitudes: one director, two deputy directors, eight window officers staggered between altitude 2.7 and 7.1, two trainees near the ground."
    >
      <Crosses pts={[[30, 30], [830, 30], [30, 614], [830, 614]]} />

      {/* altitude scale */}
      <text x="14" y="50" className="pf-t-m" fontSize="8">{L("ALT · SCENE UNITS", "海拔 · 场景单位")}</text>
      <line x1="64" y1="58" x2="64" y2="596" stroke="#232b38" strokeWidth="1" />
      {TICKS.map(([v, y]) => (
        <g key={v}>
          <line x1="60" y1={y} x2="68" y2={y} stroke="#3a4658" strokeWidth="1" />
          <text x="54" y={y + 3} textAnchor="end" className="pf-t-s" fontSize="8.5">{v}</text>
        </g>
      ))}
      {/* level hairlines */}
      {[67, 237, 268].map((y) => (
        <line key={y} x1="64" y1={y} x2="830" y2={y} stroke="#8fb0dc" strokeWidth="0.6" opacity="0.1" strokeDasharray="3 6" />
      ))}

      {/* director — the emptiest box, highest altitude */}
      <rect x="327" y="64" width="176" height="43" fill="none" stroke="rgba(217,138,114,0.22)" strokeWidth="5" />
      <rect x="330" y="67" width="170" height="37" fill="rgba(217,138,114,0.07)" stroke="#d98a72" strokeWidth="1.3" />
      <text x="415" y="83" textAnchor="middle" className="pf-t" fontSize="12.5">Eleanor Byrne</text>
      <text x="415" y="97" textAnchor="middle" className="pf-t-m" fontSize="7.5">{L("DIRECTOR · NEVER MEETS VISITORS", "主任 · 从不见访客")}</text>

      {/* command elbows to deputies */}
      <polyline points="415,107 415,150 226,150 226,235" fill="none" stroke="#55617a" strokeWidth="1" />
      <polyline points="415,107 415,150 660,150 660,264" fill="none" stroke="#55617a" strokeWidth="1" />
      <rect x="223" y="232" width="6" height="6" fill="none" stroke="#8fb0dc" strokeWidth="1" />
      <rect x="657" y="261" width="6" height="6" fill="none" stroke="#8fb0dc" strokeWidth="1" />

      {/* deputies, staggered — front sits higher than back */}
      <g>
        <rect x="150" y="237" width="152" height="32" fill="#0d1118" stroke="#f5a43a" strokeWidth="1.3" />
        <text x="164" y="251" className="pf-t" fontSize="12">Victor Roth</text>
        <text x="164" y="263" className="pf-t-m" fontSize="7.5">{L("DEPUTY DIR · FRONT", "副主任 · 前区")}</text>
        <text x="150" y="283" className="pf-t-s" fontSize="8">{L("2Y · JUNIOR TO HIS REPORTS", "2年 · 比自己的下属年轻")}</text>
      </g>
      <g>
        <rect x="584" y="268" width="152" height="30" fill="#0d1118" stroke="#7aade0" strokeWidth="1.3" />
        <text x="598" y="281" className="pf-t" fontSize="12">Priya Nair</text>
        <text x="598" y="293" className="pf-t-m" fontSize="7.5">{L("DEPUTY DIR · BACK", "副主任 · 后区")}</text>
        <text x="740" y="283" className="pf-t-s" fontSize="8">{L("8MO · EXTERNAL HIRE", "8个月 · 外聘")}</text>
      </g>

      {/* section tags */}
      <text x="150" y="311" className="pf-t-m" fontSize="8">{L("FRONT SECTION · 01–04", "前区 · 窗口 01–04")}</text>
      <text x="584" y="318" className="pf-t-m" fontSize="8">{L("BACK SECTION · 05–08", "后区 · 窗口 05–08")}</text>

      {/* deputy fans */}
      {OFF.slice(0, 4).map((o) => (
        <line key={o.num} x1="226" y1="269" x2={o.x + 66} y2={o.y} stroke="#f5a43a" strokeWidth="0.8" opacity="0.3" />
      ))}
      {OFF.slice(4).map((o) => (
        <line key={o.num} x1="660" y1="298" x2={o.x + 66} y2={o.y} stroke="#7aade0" strokeWidth="0.8" opacity="0.3" />
      ))}

      {/* officers at true altitudes */}
      {OFF.map((o) => (
        <g key={o.num}>
          <rect x={o.x} y={o.y} width="132" height="30" fill="#0d1118" stroke={o.c} strokeWidth="1" />
          <rect x={o.x} y={o.y} width="3" height="30" fill={o.c} />
          <text x={o.x + 12} y={o.y + 13} className="pf-t-m" fontSize="8">{o.num}</text>
          <text x={o.x + 32} y={o.y + 13} className="pf-t" fontSize="11">{o.name}</text>
          <text x={o.x + 12} y={o.y + 25} className="pf-t-s" fontSize="8.5">{o.role}</text>
          <text x={o.x + 138} y={o.y + 12} className="pf-t-s" fontSize="7.5" opacity="0.75">Y {o.alt}</text>
          {o.note ? (
            <text x={o.x + 2} y={o.y + 42} className="pf-t-s" fontSize="8" fill="#c9955f">{o.note}</text>
          ) : null}
        </g>
      ))}

      {/* trainees near the ground */}
      <g>
        <rect x="96" y="558" width="126" height="26" fill="none" stroke="#55617a" strokeWidth="1" strokeDasharray="4 3" />
        <text x="108" y="570" className="pf-t" fontSize="10.5">Jonah Brandt</text>
        <text x="108" y="580" className="pf-t-s" fontSize="7.5">{L("TRAINEE · WEEK 7", "实习 · 第7周")}</text>
      </g>
      <g>
        <rect x="600" y="533" width="126" height="26" fill="none" stroke="#55617a" strokeWidth="1" strokeDasharray="4 3" />
        <text x="612" y="545" className="pf-t" fontSize="10.5">Sofia Marek</text>
        <text x="612" y="555" className="pf-t-s" fontSize="7.5">{L("TRAINEE · MONTH 2", "实习 · 第2月")}</text>
      </g>

      {/* supervision */}
      <line x1="310" y1="393" x2="180" y2="556" stroke="#f0a75a" strokeWidth="0.9" strokeDasharray="2 4" opacity="0.7" />
      <text x="216" y="500" className="pf-t-m" fontSize="7.5" transform="rotate(-51 216 500)">{L("SUPERVISES", "带教")}</text>
      <line x1="560" y1="330" x2="650" y2="531" stroke="#7aade0" strokeWidth="0.9" strokeDasharray="2 4" opacity="0.7" />
      <text x="618" y="428" className="pf-t-m" fontSize="7.5" transform="rotate(66 618 428)">{L("SUPERVISES", "带教")}</text>

      {/* ground + the beam */}
      <line x1="64" y1="596" x2="830" y2="596" stroke="#232b38" strokeWidth="1.4" />
      <circle cx="430" cy="596" r="3.5" fill="#d98a72" />
      <line x1="430" y1="596" x2="384" y2="466" stroke="#d98a72" strokeWidth="0.9" strokeDasharray="3 4" opacity="0.8" />
      <text x="444" y="614" className="pf-t-m" fontSize="8">{L("GROUND — CITIZENS REMAIN HERE · A BEAM IS THE ONLY WAY IN", "地面——市民始终在此 · 一道光柱是唯一入口")}</text>
    </svg>
  );
}

function ResponsibilityDiffusion({ L }: { L: (e: string, z: string) => string }) {
  const c1 = [75, 125, 175];
  const c2 = [60, 110, 158, 200];
  const c3 = [90, 145];
  return (
    <svg
      viewBox="0 0 900 250"
      className="pf-svg"
      role="img"
      aria-label="A single request fans out across many agents over three hops; responsibility diffuses and rarely lands."
    >
      <defs>
        <marker id="pfA3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#55617a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <Crosses pts={[[24, 24], [876, 24], [24, 226], [876, 226]]} />

      {/* hop ruler */}
      <line x1="300" y1="40" x2="800" y2="40" stroke="#232b38" strokeWidth="1" />
      {[
        [340, "HOP 1"],
        [540, "HOP 2"],
        [720, "HOP 3"],
      ].map(([x, t]) => (
        <g key={t as string}>
          <line x1={x as number} y1="36" x2={x as number} y2="44" stroke="#3a4658" strokeWidth="1" />
          <text x={x as number} y="30" textAnchor="middle" className="pf-t-m" fontSize="8.5">{t}</text>
        </g>
      ))}

      {/* the request */}
      <rect x="34" y="119" width="6" height="6" fill="#d98a72" />
      <rect x="40" y="102" width="132" height="40" fill="rgba(223,230,242,0.04)" stroke="#dfe6f2" strokeWidth="1.1" />
      <text x="106" y="126" textAnchor="middle" className="pf-t" fontSize="12">{L("ONE REQUEST", "一个请求")}</text>

      {/* fan */}
      {c1.map((y) => (
        <line key={y} x1="172" y1="122" x2="331" y2={y} stroke="#8fb0dc" strokeWidth="1.2" opacity="0.7" markerEnd="url(#pfA3)" />
      ))}
      {[[75, 60], [75, 110], [125, 110], [125, 158], [175, 200]].map(([a, b], i) => (
        <line key={i} x1="349" y1={a} x2="532" y2={b} stroke="#8fb0dc" strokeWidth="1" opacity="0.45" markerEnd="url(#pfA3)" />
      ))}
      {[[60, 90], [110, 90], [158, 145], [200, 145]].map(([a, b], i) => (
        <line key={i} x1="548" y1={a} x2="713" y2={b} stroke="#8fb0dc" strokeWidth="0.9" opacity="0.28" markerEnd="url(#pfA3)" />
      ))}
      {c1.map((y) => (
        <circle key={y} cx="340" cy={y} r="9" fill="#0d1118" stroke="#8fb0dc" strokeWidth="1.1" opacity="0.95" />
      ))}
      {c2.map((y) => (
        <circle key={y} cx="540" cy={y} r="8" fill="#0d1118" stroke="#8fb0dc" strokeWidth="1" opacity="0.6" />
      ))}
      {c3.map((y) => (
        <circle key={y} cx="720" cy={y} r="7" fill="#0d1118" stroke="#8fb0dc" strokeWidth="1" opacity="0.38" />
      ))}

      {/* where it should land */}
      <circle cx="830" cy="118" r="13" fill="none" stroke="#55617a" strokeWidth="1" strokeDasharray="3 4" />
      <text x="830" y="123" textAnchor="middle" className="pf-t" fontSize="13" fill="#78849a">?</text>
      <text x="830" y="150" textAnchor="middle" className="pf-t-m" fontSize="8">{L("RARELY LANDS", "很少落地")}</text>

      <text x="40" y="216" className="pf-t-s" fontSize="10">
        {L("each hop is reasonable; the sum is a request that belongs to everyone and no one", "每一跳都合理；加总起来，请求属于所有人，也不属于任何人")}
      </text>
    </svg>
  );
}

function StoryIcon({ kind }: { kind: string }) {
  const s = { fill: "none", stroke: "#dfe6f2", strokeWidth: 1.4 } as const;
  if (kind === "enter")
    return (
      <svg viewBox="0 0 48 48" width="40" height="40">
        <rect x="10" y="8" width="20" height="26" rx="2" {...s} />
        <path d="M30 21 H42 M37 16 L42 21 L37 26" {...s} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "beam")
    return (
      <svg viewBox="0 0 48 48" width="40" height="40">
        <rect x="16" y="6" width="16" height="12" rx="2" {...s} />
        <path d="M18 18 L14 40 M30 18 L34 40" {...s} strokeLinecap="round" strokeDasharray="3 3" />
        <circle cx="24" cy="42" r="3" fill="#d98a72" stroke="none" />
      </svg>
    );
  if (kind === "reply")
    return (
      <svg viewBox="0 0 48 48" width="40" height="40">
        <rect x="8" y="12" width="24" height="18" rx="3" {...s} />
        <path d="M14 38 L14 30 L20 30" {...s} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 21 H42 M37 16 L42 21 L37 26" {...s} strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </svg>
    );
  if (kind === "memo")
    return (
      <svg viewBox="0 0 48 48" width="40" height="40">
        <rect x="8" y="14" width="14" height="10" rx="2" {...s} />
        <rect x="26" y="24" width="14" height="10" rx="2" {...s} />
        <path d="M22 19 C 34 12, 30 30, 26 29" {...s} stroke="#a8cf90" strokeDasharray="2 3" strokeLinecap="round" />
      </svg>
    );
  if (kind === "doc")
    return (
      <svg viewBox="0 0 48 48" width="40" height="40">
        <rect x="18" y="6" width="16" height="20" rx="2" fill="#0d1118" stroke="#dfe6f2" strokeWidth="1.4" />
        <path d="M24 26 L24 40" {...s} strokeLinecap="round" strokeDasharray="2 3" />
        <path d="M14 40 H34" {...s} strokeLinecap="round" />
      </svg>
    );
  if (kind === "esc")
    return (
      <svg viewBox="0 0 48 48" width="40" height="40">
        <path d="M24 40 L24 10 M16 18 L24 10 L32 18" stroke="#f0847e" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  // close
  return (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <rect x="10" y="10" width="28" height="28" rx="3" {...s} />
      <path d="M17 24 L22 29 L32 18" stroke="#7edeb0" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
