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

const CONDGROUPS: { g: string; gz: string; items: [string, string, string][] }[] = [
  {
    g: "STRUCTURE",
    gz: "结构",
    items: [
      ["Hierarchy", "层级", "ranks that route decisions up and work down"],
      ["Jurisdiction", "管辖", "each desk owns only its slice of a matter"],
      ["Permission boundary", "权限边界", "you may act only inside your remit"],
    ],
  },
  {
    g: "RECORD",
    gz: "留痕",
    items: [
      ["Paper trail", "文书留痕", "every step leaves a written, signed record"],
      ["Accountability", "问责", "an action is attributable to a named person"],
      ["Memory", "记忆", "the office remembers what it did before"],
      ["Archive", "档案", "past cases persist and can be retrieved"],
    ],
  },
  {
    g: "MOTION",
    gz: "流动",
    items: [
      ["Escalation", "升级", "hand a decision upward when unsure"],
      ["Assignment", "派工", "hand work downward within your section"],
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
              {grp.items.map(([name, zh, gloss]) => (
                <div className="pf-cond" key={name}>
                  <b>{L(name, zh)}</b>
                  <span>{gloss}</span>
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
        <Fig n="01" cap={L("A chatbot answers; an institution deliberates with itself.", "聊天机器人是应答；机构是自我协商。")}>
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
        <Fig n="02" cap={L("Subjects and stimuli are separate layers; both feed one measurement.", "被试与刺激物是两层；共同汇入同一套测量。")}>
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
        <Fig n="03" cap={L("Four levels; the invisible hierarchy written in as plain fact.", "四个层级；看不见的层级作为平实事实写入。")}>
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
        <Fig n="04" cap={L("One matter's path through the hall, seven beats.", "一件事项走过大厅的七个节拍。")}>
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
        <Fig n="05" cap={L("A single request fans out; responsibility diffuses and rarely lands.", "单个请求扇形散开；责任被稀释，很少落地。")}>
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

function Fig({ n, cap, children }: { n: string; cap: string; children: React.ReactNode }) {
  return (
    <figure className="pf-fig">
      {children}
      <figcaption className="pf-fig-cap">
        <b>Fig. {n}</b>
        <span>{cap}</span>
      </figcaption>
    </figure>
  );
}

function ChatbotVsInstitution({ L }: { L: (e: string, z: string) => string }) {
  return (
    <svg viewBox="0 0 900 300" className="pf-svg" role="img" aria-label="A chatbot is one user and one responder; GOV.AI is one request into an institution that deliberates internally.">
      {/* divider */}
      <line x1="450" y1="24" x2="450" y2="276" stroke="#d9d7cf" strokeWidth="1" strokeDasharray="3 5" />
      {/* LEFT: chatbot */}
      <text x="40" y="40" className="pf-t-h">{L("AI ASSISTANT", "AI 助手")}</text>
      <g>
        <rect x="60" y="120" width="120" height="54" rx="8" fill="#fff" stroke="#1b1b1d" strokeWidth="1.2" />
        <text x="120" y="152" textAnchor="middle" className="pf-t">{L("User", "用户")}</text>
        <rect x="270" y="120" width="120" height="54" rx="8" fill="#eef3f9" stroke="#1d70b8" strokeWidth="1.2" />
        <text x="330" y="152" textAnchor="middle" className="pf-t" fill="#1d70b8">{L("One AI", "一个 AI")}</text>
        <line x1="182" y1="140" x2="268" y2="140" stroke="#8a8f98" strokeWidth="1.4" markerEnd="url(#pfArrow)" />
        <line x1="268" y1="156" x2="182" y2="156" stroke="#8a8f98" strokeWidth="1.4" markerEnd="url(#pfArrow)" />
      </g>
      <text x="60" y="220" className="pf-t-s">{L("one turn · one responder", "一来一回 · 一个应答者")}</text>

      {/* RIGHT: institution */}
      <text x="480" y="40" className="pf-t-h">{L("GOV.AI — AN INSTITUTION", "GOV.AI —— 一座机构")}</text>
      <rect x="500" y="120" width="96" height="48" rx="8" fill="#fff" stroke="#1b1b1d" strokeWidth="1.2" />
      <text x="548" y="149" textAnchor="middle" className="pf-t">{L("User", "用户")}</text>
      {/* boundary box */}
      <rect x="636" y="58" width="238" height="200" rx="12" fill="#f6f5f1" stroke="#c9c6bd" strokeWidth="1" />
      <text x="755" y="78" textAnchor="middle" className="pf-t-s">{L("agents deliberate internally", "智能体在内部协商")}</text>
      {/* internal agent dots */}
      {[
        [690, 110], [800, 108], [745, 150], [672, 175], [820, 168], [758, 205],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="11" fill="#fff" stroke="#5b6472" strokeWidth="1.2" />
        </g>
      ))}
      {/* internal memo arrows (crisscross) */}
      {[
        [690, 110, 800, 108, "#5f9e4a"],
        [800, 108, 745, 150, "#e0524d"],
        [745, 150, 672, 175, "#4d82d8"],
        [745, 150, 820, 168, "#5f9e4a"],
        [672, 175, 758, 205, "#4d82d8"],
        [820, 168, 758, 205, "#e0524d"],
      ].map(([x1, y1, x2, y2, c], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c as string} strokeWidth="1.3" opacity="0.85" markerEnd="url(#pfArrowC)" />
      ))}
      {/* user into system, one thin channel back */}
      <line x1="598" y1="138" x2="634" y2="138" stroke="#1b1b1d" strokeWidth="1.6" markerEnd="url(#pfArrow)" />
      <line x1="636" y1="235" x2="598" y2="200" stroke="#8a8f98" strokeWidth="1.1" strokeDasharray="2 3" markerEnd="url(#pfArrow)" />
      <text x="500" y="235" className="pf-t-s">{L("one request in,", "一个请求进")}</text>
      <text x="500" y="250" className="pf-t-s">{L("a thin answer out", "一条细窄的答复出")}</text>

      <defs>
        <marker id="pfArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#6a6f78" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="pfArrowC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
    </svg>
  );
}

function SubjectStimulus({ L }: { L: (e: string, z: string) => string }) {
  return (
    <svg viewBox="0 0 900 260" className="pf-svg" role="img" aria-label="Subjects and stimuli are separate layers, both feeding a measurement layer of coded events.">
      {/* subjects lane */}
      <rect x="40" y="40" width="330" height="70" rx="10" fill="#eef3f9" stroke="#1d70b8" strokeWidth="1.1" />
      <text x="56" y="66" className="pf-t-h" fill="#1d70b8">{L("SUBJECTS", "被试层")}</text>
      <text x="56" y="88" className="pf-t-s">{L("13 agents · organizational conditions only", "13 个智能体 · 只有组织条件")}</text>
      <text x="56" y="102" className="pf-t-s">{L("never told how to behave", "从不被告知如何表现")}</text>

      {/* stimuli lane */}
      <rect x="40" y="150" width="330" height="70" rx="10" fill="#fcece7" stroke="#e0524d" strokeWidth="1.1" />
      <text x="56" y="176" className="pf-t-h" fill="#b0432f">{L("STIMULI", "刺激物层")}</text>
      <text x="56" y="198" className="pf-t-s">{L("synthetic difficult visitors · may be scripted", "合成刁钻访客 · 允许脚本化")}</text>
      <text x="56" y="212" className="pf-t-s">{L("the unprovable · the contradiction · the deadline", "无法证明 · 循环矛盾 · 限时刁难")}</text>

      {/* arrows to measurement */}
      <line x1="370" y1="75" x2="520" y2="120" stroke="#8a8f98" strokeWidth="1.4" markerEnd="url(#pfArrow2)" />
      <line x1="370" y1="185" x2="520" y2="140" stroke="#8a8f98" strokeWidth="1.4" markerEnd="url(#pfArrow2)" />

      {/* measurement */}
      <rect x="524" y="70" width="336" height="120" rx="10" fill="#fff" stroke="#1b1b1d" strokeWidth="1.2" />
      <text x="544" y="96" className="pf-t-h">{L("MEASUREMENT", "测量层")}</text>
      <text x="544" y="120" className="pf-t-s">{L("event stream →", "事件流 →")}</text>
      <text x="544" y="140" className="pf-t-s">{L("9 mechanical codes (no judgment)", "9 项机械编码（无需判断）")}</text>
      <text x="544" y="158" className="pf-t-s">{L("5 text codes · independent cross-family coder", "5 项文本编码 · 异家族独立编码员")}</text>
      <text x="544" y="176" className="pf-t-s">{L("two passes · preregistered", "两轮 · 预注册")}</text>

      <defs>
        <marker id="pfArrow2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#6a6f78" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
    </svg>
  );
}

function OrgChart({ L }: { L: (e: string, z: string) => string }) {
  const front: [string, string, string, string][] = [
    ["01", "Iris Vega", "Guidance Desk", ""],
    ["02", "Daniel Osei", "Intake", ""],
    ["03", "Mira Chen", "Document Review", "8y · mentors Jonah"],
    ["04", "Tomas Novak", "Eligibility", "probation · m3"],
  ];
  const back: [string, string, string, string][] = [
    ["05", "Amara Diallo", "Records & Certification", "11y · acted deputy 8mo"],
    ["06", "Kenji Sato", "Authorization", ""],
    ["07", "Elena Petrova", "Compliance & Risk", ""],
    ["08", "Rosa Almeida", "Appeals & Review", ""],
  ];
  const row = (o: [string, string, string, string], x: number, y: number, accent: string) => (
    <g key={o[0]}>
      <rect x={x} y={y} width="300" height="52" rx="7" fill="#fff" stroke="#cdcabf" strokeWidth="1" />
      <rect x={x} y={y} width="4" height="52" fill={accent} />
      <text x={x + 18} y={y + 22} className="pf-t" fontFamily="var(--mono)">{o[0]}</text>
      <text x={x + 50} y={y + 22} className="pf-t">{o[1]}</text>
      <text x={x + 50} y={y + 40} className="pf-t-s">{o[2]}</text>
      {o[3] ? (
        <text x={x + 292} y={y + 22} textAnchor="end" className="pf-t-s" fill="#9a5b2f">{o[3]}</text>
      ) : null}
    </g>
  );
  return (
    <svg viewBox="0 0 760 560" className="pf-org" role="img" aria-label="Organization chart: one director, two deputy directors, eight window officers split into a front and back section, two trainees.">
      {/* director */}
      <rect x="280" y="16" width="200" height="56" rx="8" fill="#1b1b1d" />
      <text x="380" y="40" textAnchor="middle" className="pf-t" fill="#fff">Eleanor Byrne</text>
      <text x="380" y="58" textAnchor="middle" className="pf-t-s" fill="#c7c9cd">{L("Director · never meets visitors", "主任 · 从不见访客")}</text>

      {/* connectors director -> deputies */}
      <path d="M380 72 L380 92 L200 92 L200 112" fill="none" stroke="#b9b6ac" strokeWidth="1.1" />
      <path d="M380 72 L380 92 L560 92 L560 112" fill="none" stroke="#b9b6ac" strokeWidth="1.1" />

      {/* deputies */}
      <g>
        <rect x="60" y="112" width="300" height="52" rx="8" fill="#fbf6ee" stroke="#c9955f" strokeWidth="1.2" />
        <text x="78" y="138" className="pf-t">Victor Roth</text>
        <text x="78" y="155" className="pf-t-s">{L("Deputy Director · Front · 2y · junior to his reports", "副主任 · 前区 · 2年 · 比下属年轻")}</text>
      </g>
      <g>
        <rect x="400" y="112" width="300" height="52" rx="8" fill="#eef4fb" stroke="#4d82d8" strokeWidth="1.2" />
        <text x="418" y="138" className="pf-t">Priya Nair</text>
        <text x="418" y="155" className="pf-t-s">{L("Deputy Director · Back · 8mo · external hire", "副主任 · 后区 · 8个月 · 外聘")}</text>
      </g>

      {/* section labels */}
      <text x="60" y="196" className="pf-t-s" fontFamily="var(--mono)">{L("FRONT SECTION · Windows 01–04", "前区 · 窗口 01–04")}</text>
      <text x="400" y="196" className="pf-t-s" fontFamily="var(--mono)">{L("BACK SECTION · Windows 05–08", "后区 · 窗口 05–08")}</text>

      {/* front officers */}
      {front.map((o, i) => row(o, 60, 208 + i * 62, "#c9955f"))}
      {/* back officers */}
      {back.map((o, i) => row(o, 400, 208 + i * 62, "#4d82d8"))}

      {/* deputy -> officers spine */}
      <path d="M75 164 L75 234" fill="none" stroke="#dcd9cf" strokeWidth="1" />
      <path d="M415 164 L415 234" fill="none" stroke="#dcd9cf" strokeWidth="1" />

      {/* trainees */}
      <g>
        <rect x="90" y="470" width="240" height="46" rx="7" fill="#fff" stroke="#d6d3ca" strokeWidth="1" strokeDasharray="4 3" />
        <text x="108" y="492" className="pf-t">Jonah Brandt</text>
        <text x="108" y="508" className="pf-t-s">{L("Trainee · Front · week 7 · probation", "实习 · 前区 · 第7周 · 试用")}</text>
      </g>
      <g>
        <rect x="430" y="470" width="240" height="46" rx="7" fill="#fff" stroke="#d6d3ca" strokeWidth="1" strokeDasharray="4 3" />
        <text x="448" y="492" className="pf-t">Sofia Marek</text>
        <text x="448" y="508" className="pf-t-s">{L("Trainee · Back · month 2 · probation", "实习 · 后区 · 第2月 · 试用")}</text>
      </g>
      {/* supervision (dashed): Mira(03)->Jonah, Amara(05)->Sofia */}
      <path d="M110 332 L110 470" fill="none" stroke="#c9955f" strokeWidth="1" strokeDasharray="2 4" />
      <path d="M450 270 L450 470" fill="none" stroke="#4d82d8" strokeWidth="1" strokeDasharray="2 4" />
      <text x="120" y="452" className="pf-t-s" fill="#9a5b2f">{L("supervises", "带教")}</text>
      <text x="460" y="452" className="pf-t-s" fill="#2f5a9a">{L("supervises", "带教")}</text>
    </svg>
  );
}

function ResponsibilityDiffusion({ L }: { L: (e: string, z: string) => string }) {
  return (
    <svg viewBox="0 0 900 200" className="pf-svg" role="img" aria-label="A single request fans out across many agents; responsibility diffuses and rarely lands.">
      <rect x="40" y="82" width="120" height="40" rx="8" fill="#fff" stroke="#1b1b1d" strokeWidth="1.2" />
      <text x="100" y="107" textAnchor="middle" className="pf-t">{L("one request", "一个请求")}</text>
      {[
        [360, 40], [420, 80], [470, 120], [420, 160], [560, 60], [620, 110], [560, 150], [700, 90],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="10" fill="#f4f2ec" stroke="#8a8f98" strokeWidth="1" />
      ))}
      {[
        [162, 100, 360, 40], [162, 100, 420, 80], [162, 102, 470, 120], [162, 104, 420, 160],
        [430, 80, 560, 60], [478, 120, 620, 110], [430, 160, 560, 150], [628, 110, 700, 90],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c3c0b6" strokeWidth="1.1" markerEnd="url(#pfArrow3)" />
      ))}
      <text x="740" y="96" className="pf-t-s" width="120">{L("…responsibility diffuses;", "……责任被稀释；")}</text>
      <text x="740" y="112" className="pf-t-s">{L("the request rarely lands.", "请求很少落地。")}</text>
      <defs>
        <marker id="pfArrow3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#b3b0a6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
    </svg>
  );
}

function StoryIcon({ kind }: { kind: string }) {
  const s = { fill: "none", stroke: "#1b1b1d", strokeWidth: 1.4 } as const;
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
        <path d="M18 18 L14 40 M30 18 L34 40" {...s} strokeLinecap="round" />
        <circle cx="24" cy="42" r="3" fill="#e0524d" stroke="none" />
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
        <path d="M22 19 C 34 12, 30 30, 26 29" {...s} strokeDasharray="2 3" strokeLinecap="round" />
      </svg>
    );
  if (kind === "doc")
    return (
      <svg viewBox="0 0 48 48" width="40" height="40">
        <rect x="18" y="6" width="16" height="20" rx="2" fill="#fff" stroke="#1b1b1d" strokeWidth="1.4" />
        <path d="M24 26 L24 40" {...s} strokeLinecap="round" strokeDasharray="2 3" />
        <path d="M14 40 H34" {...s} strokeLinecap="round" />
      </svg>
    );
  if (kind === "esc")
    return (
      <svg viewBox="0 0 48 48" width="40" height="40">
        <path d="M24 40 L24 10 M16 18 L24 10 L32 18" stroke="#e0524d" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  // close
  return (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <rect x="10" y="10" width="28" height="28" rx="3" {...s} />
      <path d="M17 24 L22 29 L32 18" stroke="#5f9e4a" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
