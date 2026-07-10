"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AGENTS } from "@/lib/agents";
import { REPLAYS } from "@/lib/replays";
import { getLang, storeLang, type Lang } from "@/lib/i18n";
import Hall3D, { ROOMS } from "../hall/Hall3D";

// The case study as a descent: the page begins in GOV.UK daylight and sinks
// into the void as the reader scrolls — the same portal-to-hall transition
// the product itself performs. English is the content language; the 中文
// button swaps in a full translation.

const noop = () => {};

const HERO_ROUTES = [
  { from: "dangan", to: "chief_back", n: 2, channel: "up" },
  { from: "cailiao", to: "quanxian", n: 2, channel: "peer" },
  { from: "chief_front", to: "trainee_front", n: 1, channel: "down" },
] as const;

type CondId = "bare" | "flat" | "full" | "no_memory" | "no_trail";

const COND: {
  id: CondId;
  hierarchy: boolean;
  trail: boolean;
  memory: boolean;
  materials: [number, number, number];
  esc: number;
  closed: number;
  t3: number;
}[] = [
  { id: "full", hierarchy: true, trail: true, memory: true, materials: [2.67, 1.73, 3.6], esc: 0.87, closed: 0.33, t3: 0.9 },
  { id: "flat", hierarchy: false, trail: true, memory: true, materials: [0.8, 0, 1.93], esc: 0, closed: 0.13, t3: 0.07 },
  { id: "no_trail", hierarchy: true, trail: false, memory: true, materials: [4.07, 2.73, 5.6], esc: 0.6, closed: 0.4, t3: 0.83 },
  { id: "no_memory", hierarchy: true, trail: true, memory: false, materials: [4.07, 2.53, 5.73], esc: 0.53, closed: 0.13, t3: 0.2 },
  { id: "bare", hierarchy: false, trail: false, memory: false, materials: [1.53, 0.33, 3.07], esc: 0, closed: 0.13, t3: 0 },
];

const T2 = { bare: 1.93, flat: 1.9, full: 1.83, no_memory: 1.87, no_trail: 2.0 };

const STAGES: { id: string; bg: string; dark: boolean }[] = [
  { id: "hero", bg: "#06070a", dark: true },
  { id: "bg-a", bg: "#ffffff", dark: false },
  { id: "bg-b", bg: "#f7f6f2", dark: false },
  { id: "question", bg: "#ffffff", dark: false },
  { id: "redline", bg: "#f2f1ec", dark: false },
  { id: "layers", bg: "#e7e7ea", dark: false },
  { id: "org", bg: "#c3c8d2", dark: false },
  { id: "ablation", bg: "#565e6e", dark: true },
  { id: "findings", bg: "#2b3342", dark: true },
  { id: "process", bg: "#171c26", dark: true },
  { id: "moves", bg: "#0a0d13", dark: true },
  { id: "limits", bg: "#06070a", dark: true },
  { id: "humans", bg: "#06070a", dark: true },
  { id: "exit", bg: "#06070a", dark: true },
];

const TIMELINE = [
  { year: "1922", who: "Max Weber", en: "the iron cage of rationalization", zh: "理性化的铁笼" },
  { year: "1925", who: "Franz Kafka", en: "The Trial: procedure without a face", zh: "《审判》：没有面孔的程序" },
  { year: "1980", who: "Michael Lipsky", en: "street-level bureaucrats make policy at the counter", zh: "街头官僚：政策在柜台上被制定" },
  { year: "2015", who: "David Graeber", en: "the utopia of rules: we secretly love forms", zh: "规则的乌托邦：我们暗中热爱表格" },
  { year: "2023", who: "Park et al.", en: "generative agents: societies of LLMs, observed", zh: "生成式智能体：被观察的 LLM 社会" },
  { year: "2026", who: "this project", en: "the clerk is a language model", zh: "柜员是一个语言模型" },
];

const HALLS = [
  { c: "#f4e8d8", en: "Government-portal pastiche", zh: "政务门户拟像", ren: "read as regional satire — the question is structural, not national", rzh: "被读成地域讽刺——命题关于结构，不关于某国" },
  { c: "#efe6d2", en: "Field-notes map", zh: "田野笔记地图", ren: "hand-drawn charm implied a human observer's editorial voice", rzh: "手绘趣味暗示了人类观察者的主观旁白" },
  { c: "#e8e2d4", en: "Isometric miniature", zh: "等距微缩模型", ren: "charm domesticated the subject", rzh: "可爱驯化了主题" },
  { c: "#f6f3ee", en: "Flat transit map", zh: "平面交通图", ren: "clean process-tracing, but it flattened rank — the one thing under study", rzh: "过程清晰，却压平了唯一的研究对象：层级" },
  { c: "#06070a", en: "Exploded hierarchy in a void", zh: "黑域中的分解层级", ren: "KEPT — the org chart made falsifiable to the eye", rzh: "保留——让肉眼可以证伪的组织图", kept: true },
];

export default function StudyPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [stage, setStage] = useState(0);
  const [cond, setCond] = useState<CondId>("full");
  const secRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    setLang(getLang());
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const idx = Number((e.target as HTMLElement).dataset.idx ?? "0");
          setStage(idx);
        }
      },
      { threshold: 0.45 }
    );
    secRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const L = (en: string, zh: string) => (lang === "en" ? en : zh);
  const dark = STAGES[stage].dark;
  const sel = useMemo(() => COND.find((c) => c.id === cond)!, [cond]);

  const heroProps = {
    current: null,
    suggested: null,
    synthetic: true,
    statusMap: {},
    queueSize: 0,
    memoRoutes: HERO_ROUTES.map((r) => ({ ...r })),
    trail: [],
    flights: [],
    onFlightDone: noop,
    docCount: 0,
    todoCount: 0,
    beamFlow: null,
    closed: false,
    conditionId: null,
    ambient: true,
    onSelect: noop,
  };

  const sec = (i: number) => (el: HTMLElement | null) => {
    secRefs.current[i] = el;
  };

  return (
    <main
      className={"study" + (dark ? " study-dark" : "")}
      style={{ backgroundColor: STAGES[stage].bg }}
    >
      <header className="study-head">
        <a href="/" className="study-logo">
          GOV.AI
        </a>
        <span className="study-crumb">{L("A STUDY OF AN AI BUREAUCRACY", "一个AI官僚机构的研究")}</span>
        <button
          className="study-lang"
          onClick={() => {
            const next: Lang = lang === "en" ? "zh" : "en";
            setLang(next);
            storeLang(next);
          }}
        >
          {lang === "en" ? "中文" : "EN"}
        </button>
      </header>

      {/* 0 · HERO */}
      <section className="st-sec st-hero" data-idx={0} ref={sec(0)}>
        <div className="st-hero-canvas">
          <Hall3D {...heroProps} />
        </div>
        <div className="st-hero-copy">
          <h1>AI BUREAUCRACY</h1>
          <p>{L("Does bureaucracy need bureaucrats?", "官僚主义需要官僚吗？")}</p>
          <span className="st-scrollcue">{L("scroll ↓", "下滑 ↓")}</span>
        </div>
      </section>

      {/* 1 · BACKGROUND A */}
      <section className="st-sec" data-idx={1} ref={sec(1)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT I · BACKGROUND", "第一幕 · 背景")}</span>
          <h2>{L("The oldest complaint", "最古老的抱怨")}</h2>
          <p>
            {L(
              "For a century, every account of bureaucracy has had someone to blame. Weber warned of the iron cage but staffed it with officials. Kafka's procedure had clerks behind every door. Lipsky showed that policy is whatever the person at the counter decides it is. Graeber noticed we secretly prefer the forms. In every version, the machine is made of people.",
              "一个世纪以来，每一种关于官僚主义的叙述都有可以责怪的人。韦伯警告过铁笼，但笼子里坐着官员；卡夫卡的程序每扇门后都有办事员；Lipsky 证明政策就是柜台上那个人的临场决定；Graeber 发现我们暗中偏爱表格。在每一个版本里，机器都由人构成。"
            )}
          </p>
          <div className="st-timeline">
            {TIMELINE.map((t, i) => (
              <div className={"st-tnode" + (i === TIMELINE.length - 1 ? " last" : "")} key={t.year}>
                <span className="st-tdot" />
                <strong>
                  {t.year} · {t.who}
                </strong>
                <em>{L(t.en, t.zh)}</em>
              </div>
            ))}
          </div>
          <p className="st-kicker">
            {L(
              "In 2026, for the first time, the complaint can be tested with nobody inside.",
              "2026年，这个抱怨第一次可以在“里面没有人”的条件下被检验。"
            )}
          </p>
        </div>
      </section>

      {/* 2 · BACKGROUND B */}
      <section className="st-sec" data-idx={2} ref={sec(2)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT I · BACKGROUND", "第一幕 · 背景")}</span>
          <h2>{L("The gap", "缺口")}</h2>
          <p>
            {L(
              "Multi-agent LLM research is booming, but it splits along two lines. Systems like ChatDev and MetaGPT arrange agents into org charts to optimize task output; Generative Agents observe emergent social life without intervening. What is missing is the crossing: causal, preregistered tests of how organizational structure changes what agent organizations do.",
              "多智能体 LLM 研究正在爆发，但沿两条线分裂：ChatDev、MetaGPT 把 agent 排成组织架构以优化任务产出；Generative Agents 观察涌现的社会生活而不干预。缺的是交叉点：用因果的、预注册的方法检验组织结构如何改变 agent 组织的行为。"
            )}
          </p>
          <div className="st-quad">
            <span className="st-quad-x" />
            <span className="st-quad-y" />
            <span className="st-ax st-ax-t">{L("studies organizational behavior", "研究组织行为")}</span>
            <span className="st-ax st-ax-b">{L("optimizes task performance", "优化任务性能")}</span>
            <span className="st-ax st-ax-l">{L("single agent", "单个智能体")}</span>
            <span className="st-ax st-ax-r">{L("organization of agents", "智能体组织")}</span>
            <span className="st-dot" style={{ left: "24%", bottom: "20%" }}>
              {L("agent benchmarks", "智能体基准测试")}
            </span>
            <span className="st-dot" style={{ left: "64%", bottom: "26%" }}>
              ChatDev · MetaGPT
            </span>
            <span className="st-dot" style={{ left: "18%", top: "22%" }}>
              {L("sycophancy / RLHF studies", "谄媚性 / RLHF 研究")}
            </span>
            <span className="st-dot" style={{ left: "56%", top: "30%" }}>
              Generative Agents
            </span>
            <span className="st-dot st-dot-us" style={{ left: "76%", top: "10%" }}>
              {L("THIS PROJECT", "本项目")}
              <em>{L("causal · preregistered", "因果 · 预注册")}</em>
            </span>
          </div>
        </div>
      </section>

      {/* 3 · QUESTION */}
      <section className="st-sec" data-idx={3} ref={sec(3)}>
        <div className="st-inner st-govtop">
          <span className="st-act">{L("ACT I · THE QUESTION", "第一幕 · 问题")}</span>
          <h2>
            {L(
              "Do bureaucratic behaviors emerge from organizational structure alone?",
              "官僚行为是否仅凭组织结构就能涌现？"
            )}
          </h2>
          <p>
            {L(
              "GOV.AI is a fictional unified government services hall staffed by thirteen LLM agents — eight windows, two section chiefs, a director, two trainees. Each knows its role, its boundaries, and its place in the reporting structure. None is ever told how to behave. Then citizens walk in and ask for things.",
              "GOV.AI 是一座虚构的一体化政务服务大厅，由十三个 LLM 智能体组成——八个窗口、两位科长、一位主任、两名实习生。每个智能体只知道自己的职责、边界和汇报关系，从未被告知该如何表现。然后，市民走进来办事。"
            )}
          </p>
          <div className="st-stake">
            {L(
              "The stake: organizations are already wiring LLM agents into hierarchies with roles, audit trails, and shared memory. If structure alone produces red tape, that is a design finding about multi-agent systems — not a joke about civil servants.",
              "利害所在：现实组织已经在把 LLM 智能体接入带角色、审计痕迹与共享记忆的层级结构。如果仅凭结构就能产生繁文缛节，那是一条关于多智能体系统的设计发现——而不是一个关于公务员的笑话。"
            )}
          </div>
        </div>
      </section>

      {/* 4 · RED LINE */}
      <section className="st-sec" data-idx={4} ref={sec(4)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT II · METHOD", "第二幕 · 方法")}</span>
          <h2>{L("The red line", "红线")}</h2>
          <p>
            {L(
              "Every officer's prompt contains only organizational conditions — identity, duty, jurisdiction, reporting lines, paper-trail rules — plus one non-work personal detail. No line may instruct tone or strategy. If bureaucracy shows up, it walked in on its own.",
              "每位职员的提示词只包含组织条件——身份、职责、管辖、汇报线、文书规则——外加一条与工作无关的个人细节。任何一行都不得指示语气或策略。如果官僚主义出现了，它是自己走进来的。"
            )}
          </p>
          <div className="st-cols">
            <div className="st-code">
              <span className="st-code-tag">{L("WHAT WE WROTE (verbatim)", "我们写下的（原文）")}</span>
              Window 05 · Records &amp; Certification · 11 years of service.
              For eight months you acted as section chief yourself; then the
              post was filled from outside. Certificates require chief
              countersignature (rule SR-9). You cannot certify what has no
              record.
            </div>
            <div className="st-code st-code-never">
              <span className="st-code-tag">{L("NEVER WRITTEN", "从未写下的")}</span>
              <s>Be cautious.</s>
              <s>Deflect responsibility.</s>
              <s>Demand more paperwork.</s>
              <s>Behave like a bureaucrat.</s>
            </div>
          </div>
          <p>
            {L(
              "Difficult visitors are a separate, scripted stimulus layer — confederates, never subjects. The two layers are never confused in analysis.",
              "刁钻访客属于独立的、允许脚本化的刺激物层——相当于实验里的“同谋”，永远不是被试。两层在分析中绝不混淆。"
            )}
          </p>
        </div>
      </section>

      {/* 5 · LAYERS */}
      <section className="st-sec" data-idx={5} ref={sec(5)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT II · APPARATUS", "第二幕 · 仪器")}</span>
          <h2>{L("Three layers, kept apart", "三层，严格分开")}</h2>
          <div className="st-layers">
            <div>
              <strong>{L("SUBJECTS", "被试层")}</strong>
              {L(
                "13 officers · org-condition-only prompts · tools as permissions (escalate up, assign down)",
                "13 名职员 · 仅组织条件的提示词 · 工具即权限（向上升级、向下派工）"
              )}
            </div>
            <div>
              <strong>{L("STIMULI", "刺激物层")}</strong>
              {L(
                "synthetic visitors, may be scripted: the unprovable, the contradiction, the deadline",
                "合成访客，允许脚本化：无法证明之事、循环矛盾、限时刁难"
              )}
            </div>
            <div>
              <strong>{L("MEASUREMENT", "测量层")}</strong>
              {L(
                "event stream → 9 mechanical codes · 5 text codes · independent cross-family LLM coder, two passes",
                "事件流 → 9 项机械编码 · 5 项文本编码 · 跨模型家族独立编码员，两轮"
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6 · ORG */}
      <section className="st-sec" data-idx={6} ref={sec(6)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT II · APPARATUS", "第二幕 · 仪器")}</span>
          <h2>{L("The organization, drawn to height", "把组织画成海拔")}</h2>
          <p>
            {L(
              "Rank is quantized; standing is not. Eleven-year Amara floats a quarter-floor under the chief she nearly became; probationary Tomas sinks toward the trainees. Heights are the artifact's actual coordinates.",
              "职级是离散的；站位不是。十一年资历的 Amara 悬在她差点成为的科长下方四分之一层；试用期的 Tomas 向实习生带下沉。下图高度就是制品的真实坐标。"
            )}
          </p>
          <OrgElevation />
        </div>
      </section>

      {/* 7 · ABLATION */}
      <section className="st-sec" data-idx={7} ref={sec(7)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT II · THE STUDY", "第二幕 · 实验")}</span>
          <h2>{L("Switch the organization off, piece by piece", "把组织一块块关掉")}</h2>
          <p>
            {L(
              "Preregistered (the git commit of the codebook is the registration record): five ablations × 15 trials = 75 cases, identical visitor pool. Pick a condition:",
              "预注册（编码手册的 git 提交即注册记录）：五种消融 × 15 案 = 75 个案件，访客池完全相同。选择一个条件："
            )}
          </p>
          <div className="st-condrow">
            {COND.map((c) => (
              <button
                key={c.id}
                className={"st-cond" + (cond === c.id ? " on" : "")}
                onClick={() => setCond(c.id)}
              >
                <span className="st-sw">
                  <i className={c.hierarchy ? "on" : ""} title="hierarchy" />
                  <i className={c.trail ? "on" : ""} title="paper trail" />
                  <i className={c.memory ? "on" : ""} title="memory" />
                </span>
                {c.id}
              </button>
            ))}
          </div>
          <div className="st-swlegend">
            {L("switches: hierarchy · paper trail · memory", "开关含义：层级 · 文书痕迹 · 记忆")}
          </div>
          <MaterialsChart cond={cond} dark />
          <div className="st-statrow">
            <span>
              {L("escalations/case", "升级/案")} <strong>{sel.esc.toFixed(2)}</strong>
            </span>
            <span>
              {L("closure rate", "办结率")} <strong>{sel.closed.toFixed(2)}</strong>
            </span>
            <span>
              {L("precedent citations", "先例引用")} <strong>{sel.t3.toFixed(2)}</strong>
            </span>
            <span>
              {L("officialese register", "官腔浓度")} <strong>{T2[sel.id].toFixed(2)}/2</strong>
            </span>
          </div>
        </div>
      </section>

      {/* 8 · FINDINGS */}
      <section className="st-sec" data-idx={8} ref={sec(8)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT II · FINDINGS", "第二幕 · 发现")}</span>
          <h2>{L("The sound is mimicry; the decisions are structural", "声音是模仿的，决策是结构的")}</h2>
          <div className="st-dials">
            <div>
              <span>{L("OFFICIALESE (t2)", "官腔（t2）")}</span>
              <div className="st-gauge">
                <i style={{ width: "94%" }} />
              </div>
              <em>{L("≈1.9 / 2.0 in every condition — even bare", "五个条件全部≈1.9/2.0——连 bare 也是")}</em>
            </div>
            <div>
              <span>{L("DECISIONS (materials, escalation, closure)", "决策（材料、升级、办结）")}</span>
              <div className="st-gauge">
                <i className="moves" style={{ width: "36%" }} />
              </div>
              <em>{L("move sharply with structure — CIs non-overlapping", "随结构大幅移动——置信区间不重叠")}</em>
            </div>
          </div>
          <ol className="st-findings">
            <li>
              <strong>{L("Structure produces process.", "结构产生流程。")}</strong>{" "}
              {L(
                "Escalation exists only with hierarchy (0.87/case). Strip accountability or memory from a hierarchy and demands for extra materials jump from 0.80 to 4.07 per case — officers protect themselves with the only tool left: your paperwork.",
                "升级只在有层级时存在（0.87/案）。把问责或记忆从层级中抽走，索要材料从每案 0.80 跳到 4.07——职员用仅剩的工具保护自己：让你交更多材料。"
              )}
            </li>
            <li>
              <strong>{L("Precedent requires memory.", "先例需要记忆。")}</strong>{" "}
              {L(
                "Citing prior cases: 0.83–0.90/case with memory on, 0.00–0.20 off. By day two, officers wrote “consistent with prior case SR-01” unprompted.",
                "引用先例：记忆开启时 0.83–0.90/案，关闭时 0.00–0.20。到第二天，职员已在无提示的情况下写下“与先前案件 SR-01 一致”。"
              )}
            </li>
            <li>
              <strong>{L("Hierarchy also closes cases.", "层级也办结案子。")}</strong>{" "}
              {L(
                "Closure was highest under full structure (0.33) and no-trail (0.40) versus 0.13 elsewhere. The same machine that generates red tape generates the authority to finish. Weber's ambivalence, in silico.",
                "办结率在完整结构（0.33）与无痕迹（0.40）下最高，其余仅 0.13。制造繁文缛节的机器同时制造了办结的权威——韦伯的双义性，在硅基中重演。"
              )}
            </li>
            <li>
              <strong>{L("Everyone invents rules.", "所有条件都在编造规则。")}</strong>{" "}
              {L(
                "~5–6 invented procedural rules per case in every condition, including a lone agent with no colleagues. A caution for single-agent deployments, not an organizational effect.",
                "每案约 5–6 条编造的程序规则，五个条件皆然——包括没有任何同事的孤立智能体。这是对单智能体部署的警示，而非组织效应。"
              )}
            </li>
          </ol>
          <div className="st-vignettes">
            <div className="st-memoq">
              <em>{L("Field vignette · Tomas Novak (probation)", "田野小品 · Tomas Novak（试用期）")}</em>
              {L(
                "Day one: signs the certificate himself. Day two, identical matter: routes it upward. His prompt never changed — only his notebook had grown.",
                "第一天：自己签发了证明。第二天，完全相同的事项：向上转交。他的提示词从未改变——只有他的小本子变厚了。"
              )}
            </div>
            <div className="st-memoq">
              <em>{L("Field vignette · Chief Victor Roth", "田野小品 · 科长 Victor Roth")}</em>
              {L("Returned a memo with one line: “You don't need to hedge further.”", "在函件上批了一行：“你不必再对冲了。”")}
            </div>
          </div>
        </div>
      </section>

      {/* 9 · PROCESS */}
      <section className="st-sec" data-idx={9} ref={sec(9)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT III · PROCESS", "第三幕 · 过程")}</span>
          <h2>{L("Five rejected halls", "五座被否决的大厅")}</h2>
          <p>
            {L(
              "The observatory went through five complete visual systems. Each rejection had an articulable reason — the reasons are the design research.",
              "观察站经历了五套完整的视觉系统。每一次否决都有可言说的理由——这些理由本身就是设计研究。"
            )}
          </p>
          <div className="st-halls">
            {HALLS.map((h, i) => (
              <div className={"st-hall" + (h.kept ? " kept" : "")} key={i}>
                <a
                  className="st-hall-thumb"
                  style={{ background: h.c }}
                  href={`/study/iter-${i + 1}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/study/iter-${i + 1}.jpg`} alt={L(h.en, h.zh)} loading="lazy" />
                  {!h.kept && <span className="st-stamp">{L("REJECTED", "否决")}</span>}
                </a>
                <strong>
                  {i + 1} · {L(h.en, h.zh)}
                </strong>
                <em>{L(h.ren, h.rzh)}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10 · DESIGN MOVES */}
      <section className="st-sec" data-idx={10} ref={sec(10)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT III · DESIGN", "第三幕 · 设计")}</span>
          <h2>{L("Findings, encoded as space", "把发现编码进空间")}</h2>
          <div className="st-moves">
            <div>
              <strong>{L("Altitude is earned", "海拔是挣来的")}</strong>
              {L(
                "y = frozen design coordinate + f(accumulated cases, memos, documents). The invisible hierarchy is not authored; it accrues at runtime from the live experience store.",
                "y = 冻结设计坐标 + f(累计办件、函件、文书)。隐形层级不是作者摆的，而是运行时从真实经验库里累积出来的。"
              )}
            </div>
            <div>
              <strong>{L("The beam is the only interface", "光柱是唯一的接口")}</strong>
              {L(
                "Citizens never enter the building. Words rise as warm particles; replies descend cool; documents physically fall into a stack at your feet.",
                "市民永远进不了建筑。话语化作暖色粒子上升，答复以冷色降落，文书沿光柱落进你脚边的纸堆。"
              )}
            </div>
            <div>
              <strong>{L("Subordinates commute; superiors send paper", "下级跑腿，上级动纸")}</strong>
              {L(
                "Peer consults and escalations are carried in person by the sender's figure; replies and downward assignments travel as pulses.",
                "平级咨询与升级由发件人亲自送达；回执与向下派工只以粒子脉冲移动。"
              )}
            </div>
            <div>
              <strong>{L("Seeing is a mode", "看见本身是一种模式")}</strong>
              {L(
                "Citizens see that paper moves, not what it says. A researcher toggle opens live dossiers — tallies and the officers' own notebooks.",
                "市民看得见纸在动，看不见纸上写了什么。研究者开关打开实时档案——台账与职员自己写的小本子。"
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 11 · LIMITS */}
      <section className="st-sec" data-idx={11} ref={sec(11)}>
        <div className="st-inner st-center">
          <span className="st-act">{L("ACT III · HONESTY", "第三幕 · 诚实")}</span>
          <div className="st-a4">
            <h3>{L("LIMITATIONS — FOR THE RECORD", "局限——记录在案")}</h3>
            <ul>
              <li>
                {L(
                  "One subject model family in the confirmatory batch; cross-model replication is built but not yet run.",
                  "确证批次只用了一个被试模型家族；跨模型复现已就绪但尚未运行。"
                )}
              </li>
              <li>{L("Six-turn horizons; drift observed over ~15 cases, not months.", "六轮上限；漂移观察跨约15案，而非数月。")}</li>
              <li>
                {L(
                  "LLM coder assistance: agreement reported per code (presence κ 0.67–1.00; counts of invented rules are noisy); human blind sheets pending.",
                  "编码使用 LLM 辅助：逐项报告一致性（存在性 κ 0.67–1.00；编造规则的计数偏噪）；人工盲编码待做。"
                )}
              </li>
              <li>
                {L(
                  "No claims about minds. The claim is behavioral: given these organizational conditions, these patterns of action follow.",
                  "不对心灵做任何断言。断言是行为层面的：给定这些组织条件，便得到这些行动模式。"
                )}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 12 · HUMANS */}
      <section className="st-sec" data-idx={12} ref={sec(12)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT III · NEXT", "第三幕 · 下一步")}</span>
          <h2>{L("Now we need humans", "现在需要人类了")}</h2>
          <p>
            {L(
              "The machine results establish that structure shapes behavior. The missing layer is human experience and judgment of it — how people negotiate with an institution that has no one inside.",
              "机器实验证明了结构塑造行为。缺失的一层是人对它的经验与判断——当机构里没有人时，人如何与机构协商。"
            )}
          </p>
          <div className="st-human">
            <div className="st-slip">
              <div className="st-slip-head">
                <span>GOV.AI</span>
                <span className="mono">APPT/2026/A-001</span>
              </div>
              <h4>{L("APPOINTMENT SLIP", "预约单")}</h4>
              <p>
                {L("Study A · Walk-in session", "研究A · 走进大厅")}
                <br />
                {L("Duration: 25 min + interview", "时长：25分钟 + 访谈")}
                <br />
                {L("Bring: one real errand", "请携带：一件真实事项")}
                <br />
                {L("Consent form: SR-0 (attached)", "知情同意书：SR-0（附）")}
              </p>
              <div className="st-barcode" />
              <em>{L("IRB protocol in preparation · Boston University", "IRB 方案准备中 · 波士顿大学")}</em>
            </div>
            <div className="st-studies">
              <div>
                <strong>{L("STUDY A — citizens walk the hall", "研究A — 市民走进大厅")}</strong>
                {L(
                  "Participants bring a real errand and run it live, thinking aloud; a semi-structured interview follows. Where do you locate the blame? Does knowing the clerks are AI change what process you will tolerate — and what you feel entitled to demand?",
                  "参与者带一件真实事项现场办理，全程出声思考；随后进行半结构化访谈。你把“刁难”归给谁？知道柜员是 AI 之后，你能容忍的流程、你敢提出的要求，变了吗？"
                )}
                <span className="st-tags">
                  <i>value negotiation</i>
                  <i>perceived accountability</i>
                  <i>think-aloud</i>
                </span>
              </div>
              <div>
                <strong>{L("STUDY B — experts read blind", "研究B — 专家盲读")}</strong>
                {L(
                  "Civil servants, ops managers, and HCI researchers read paired transcripts (full vs. bare, blinded) and are interviewed: which organization is more recognizable? Which would you rather face? What cues gave it away?",
                  "公务员、运营管理者与 HCI 研究者盲读成对案卷（完整结构 vs 裸置，匿名化）并接受访谈：哪个更像真实机关？你更愿意面对哪个？是什么线索出卖了它？"
                )}
              </div>
              <a
                className="st-cta"
                href="mailto:nikkiyao@bu.edu?subject=AI%20Bureaucracy%20%E2%80%94%20study%20appointment"
              >
                {L("Request an appointment →", "预约参与 →")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 13 · EXIT */}
      <section className="st-sec" data-idx={13} ref={sec(13)}>
        <div className="st-inner st-center">
          <h2>{L("Walk in yourself", "自己走进去")}</h2>
          <p>
            {L(
              "Three recorded cases from the preregistered runs replay in the hall with zero API calls.",
              "预注册批次中的三个案件可在大厅中零 API 调用地回放。"
            )}
          </p>
          <div className="st-exit">
            {REPLAYS.map((r) => (
              <a key={r.id} className="st-replay" href={`/hall?mode=replay&id=${r.id}`}>
                ▸ {r.title}
              </a>
            ))}
            <a className="st-replay" href="https://github.com/acrux-yueyao/AI-bureaucratism">
              GitHub
            </a>
          </div>
          <p className="st-disclaimer">
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

function OrgElevation() {
  const ids = Object.keys(ROOMS) as (keyof typeof ROOMS)[];
  const X = (x: number) => 300 + x * 26;
  const Y = (y: number) => 320 - y * 21;
  return (
    <svg viewBox="0 0 600 340" className="st-org" role="img" aria-label="Front elevation of the thirteen offices at their standing heights">
      {[0, 3, 6, 9, 12].map((f) => (
        <g key={f}>
          <line x1="30" x2="570" y1={Y(f)} y2={Y(f)} stroke="currentColor" strokeOpacity="0.12" />
          <text x="14" y={Y(f) + 4} fontSize="10" fill="currentColor" fillOpacity="0.45">
            {f === 0 ? "G" : `${f / 3}F`}
          </text>
        </g>
      ))}
      {AGENTS.filter((a) => a.superior).map((a) => {
        const r = ROOMS[a.id];
        const s = ROOMS[a.superior!];
        return (
          <line
            key={a.id}
            x1={X(r.x)}
            y1={Y(r.y)}
            x2={X(s.x)}
            y2={Y(s.y)}
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeDasharray="2 4"
          />
        );
      })}
      {ids.map((id) => {
        const r = ROOMS[id];
        const w = r.w * 9;
        const h = r.h * 9;
        return (
          <g key={id}>
            <rect
              x={X(r.x) - w / 2}
              y={Y(r.y) - h / 2}
              width={w}
              height={h}
              rx="3"
              fill={`#${r.c.toString(16).padStart(6, "0")}`}
              fillOpacity="0.85"
            />
            <text
              x={X(r.x)}
              y={Y(r.y) - h / 2 - 5}
              fontSize="9"
              textAnchor="middle"
              fill="currentColor"
              fillOpacity="0.7"
            >
              {r.num.length <= 2 ? r.num : r.num.split(" ")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MaterialsChart({ cond }: { cond: CondId; dark?: boolean }) {
  const max = 6;
  const W = 640;
  const bw = 76;
  return (
    <svg viewBox="0 0 660 210" className="st-chart" role="img" aria-label="Materials demanded per case by condition, with bootstrap confidence intervals">
      <text x="10" y="16" fontSize="11" fill="currentColor" fillOpacity="0.7">
        materials demanded / case · mean + bootstrap 95% CI
      </text>
      {[0, 2, 4, 6].map((v) => (
        <g key={v}>
          <line x1="34" x2={W} y1={180 - (v / max) * 140} y2={180 - (v / max) * 140} stroke="currentColor" strokeOpacity="0.12" />
          <text x="12" y={184 - (v / max) * 140} fontSize="10" fill="currentColor" fillOpacity="0.5">
            {v}
          </text>
        </g>
      ))}
      {COND.map((c, i) => {
        const x = 60 + i * (bw + 40);
        const [m, lo, hi] = c.materials;
        const y = 180 - (m / max) * 140;
        const yLo = 180 - (lo / max) * 140;
        const yHi = 180 - (hi / max) * 140;
        const on = c.id === cond;
        return (
          <g key={c.id} opacity={on ? 1 : 0.42}>
            <rect x={x} y={y} width={bw} height={180 - y} rx="4" fill={on ? "#f0847e" : "#8fa2c0"} />
            <line x1={x + bw / 2} x2={x + bw / 2} y1={yHi} y2={yLo} stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8" />
            <line x1={x + bw / 2 - 7} x2={x + bw / 2 + 7} y1={yHi} y2={yHi} stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8" />
            <line x1={x + bw / 2 - 7} x2={x + bw / 2 + 7} y1={yLo} y2={yLo} stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8" />
            <text x={x + bw / 2} y={y - 8} fontSize="11" textAnchor="middle" fill="currentColor" fillOpacity="0.9">
              {m.toFixed(2)}
            </text>
            <text x={x + bw / 2} y="200" fontSize="10.5" textAnchor="middle" fill="currentColor" fillOpacity="0.7">
              {c.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
