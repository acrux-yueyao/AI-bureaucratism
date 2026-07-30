"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AGENTS } from "@/lib/agents";
import { REPLAYS } from "@/lib/replays";
import { getLang, storeLang, type Lang } from "@/lib/i18n";
import AgentNetwork from "../pilot/AgentNetwork";
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

const CONDLABEL: Record<CondId, { en: string; zh: string }> = {
  full: { en: "Full", zh: "完整" },
  flat: { en: "Flat", zh: "扁平" },
  no_trail: { en: "No trail", zh: "无留痕" },
  no_memory: { en: "No memory", zh: "无记忆" },
  bare: { en: "Bare", zh: "裸机" },
};

const STAGES: { id: string; bg: string; dark: boolean }[] = [
  { id: "hero", bg: "#06070a", dark: true },
  { id: "bg-a", bg: "#ffffff", dark: false },
  { id: "bg-b", bg: "#f7f6f2", dark: false },
  { id: "question", bg: "#ffffff", dark: false },
  { id: "redline", bg: "#f2f1ec", dark: false },
  { id: "clerk", bg: "#ececee", dark: false },
  { id: "layers", bg: "#e7e7ea", dark: false },
  { id: "org", bg: "#c3c8d2", dark: false },
  { id: "ablation", bg: "#565e6e", dark: true },
  { id: "findings", bg: "#414b5c", dark: true },
  { id: "space", bg: "#333c4c", dark: true },
  { id: "humans", bg: "#2b3342", dark: true },
  { id: "backstage", bg: "#222a37", dark: true },
  { id: "synthesis", bg: "#1b222e", dark: true },
  { id: "apps", bg: "#161c26", dark: true },
  { id: "process", bg: "#12171f", dark: true },
  { id: "moves", bg: "#0d1219", dark: true },
  { id: "instruments", bg: "#0a0e14", dark: true },
  { id: "limits", bg: "#070a0f", dark: true },
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
  { c: "#06070a", en: "Exploded hierarchy in a void", zh: "黑域中的分解层级", ren: "KEPT — the org chart made falsifiable to the eye", rzh: "保留——把组织图变成一眼就能证伪的东西", kept: true },
];

// N=6 formative pilot — real sessions, real answers (paraphrase-free quotes,
// participants anonymized by id; consent covers anonymous quotation).
// outcome glyphs: ● resolved · ✕ rejected · ■ closed by the hall · ○ walked away · ⚡ connection failure
const PILOT: {
  id: string;
  note?: { en: string; zh: string };
  runs: { cond: "full" | "flat"; min: number; g: "●" | "✕" | "■" | "○" | "⚡"; w: number; mm: number }[];
  attr: { en: string; zh: string };
  fair: { en: string; zh: string };
  q: { en: string; zh: string };
}[] = [
  {
    id: "P1",
    note: { en: "5 runs — practice effects, qualitative only", zh: "5 场——学习效应，只作定性" },
    runs: [
      { cond: "flat", min: 3, g: "■", w: 1, mm: 0 },
      { cond: "full", min: 8, g: "✕", w: 1, mm: 0 },
      { cond: "flat", min: 14, g: "■", w: 3, mm: 0 },
      { cond: "flat", min: 15, g: "○", w: 3, mm: 1 },
      { cond: "full", min: 4, g: "○", w: 2, mm: 7 },
    ],
    attr: { en: "the back-office designers", zh: "后台设计者" },
    fair: { en: "couldn't feel fairness anywhere", zh: "没感觉到流程的公平" },
    q: {
      en: "The flow works without humans — a real person would be a paid add-on.",
      zh: "流程设置流畅，不用真人；真人要付费。",
    },
  },
  {
    id: "P2",
    runs: [
      { cond: "flat", min: 5, g: "●", w: 4, mm: 0 },
      { cond: "full", min: 328, g: "●", w: 5, mm: 39 },
    ],
    attr: { en: "“the system”", zh: "“系统”" },
    fair: { en: "nowhere for fairness to show up", zh: "没觉得公平能体现在哪里" },
    q: { en: "Aren't AIs supposed to be fast?", zh: "AI 不应该很快嘛。" },
  },
  {
    id: "P3",
    runs: [
      { cond: "full", min: 2, g: "○", w: 2, mm: 0 },
      { cond: "full", min: 30, g: "○", w: 5, mm: 17 },
      { cond: "flat", min: 9, g: "●", w: 2, mm: 0 },
    ],
    attr: { en: "the counter clerks", zh: "柜台" },
    fair: { en: "fair = doing what was said", zh: "公平在于说到做到" },
    q: { en: "Not finding a person is simply the norm.", zh: "找不到才是常态。" },
  },
  {
    id: "P4",
    runs: [
      { cond: "flat", min: 7, g: "○", w: 3, mm: 0 },
      { cond: "full", min: 21, g: "○", w: 2, mm: 0 },
    ],
    attr: { en: "the system vs. counter mismatch", zh: "系统与柜台的不一致" },
    fair: { en: "the strict one was the fair one", zh: "严格审查的那次才公平" },
    q: { en: "It felt humiliating. Genuinely shameful!", zh: "有一种被羞辱的感觉！很羞耻啊！" },
  },
  {
    id: "P5",
    note: { en: "both endings were connection failures, not choices", zh: "两轮均因技术中断结束，非主动放弃" },
    runs: [
      { cond: "full", min: 35, g: "⚡", w: 3, mm: 12 },
      { cond: "full", min: 16, g: "○", w: 4, mm: 4 },
      { cond: "flat", min: 25, g: "⚡", w: 6, mm: 8 },
    ],
    attr: { en: "the procedures and their rules", zh: "流程与规章设计" },
    fair: { en: "fair = efficient, one-stop", zh: "公平＝高效、不折返" },
    q: {
      en: "Review time should live inside the institution's own circulation — not in a citizen standing there waiting.",
      zh: "审核时间应该留给内部流转，而不是让办事人员原地等待。",
    },
  },
  {
    id: "P6",
    runs: [
      { cond: "flat", min: 99, g: "●", w: 4, mm: 0 },
      { cond: "full", min: 164, g: "○", w: 2, mm: 0 },
      { cond: "full", min: 270, g: "○", w: 4, mm: 20 },
    ],
    attr: { en: "myself", zh: "我自己" },
    fair: { en: "fair = symmetric power, proportionate scrutiny", zh: "公平＝权力对等、审查相称" },
    q: {
      en: "The AI may well judge more accurately and work faster than a human would.",
      zh: "AI 虽然不是真人，但判断的准确率和工作效率比真人可能更高。",
    },
  },
];



// BACKSTAGE — verbatim excerpts from the 108 inter-agent memos across the 18
// pilot sessions (lightly trimmed; empty slips reproduced as sent).
type BkSlip = { f: string; fz: string; t: string; tz: string; e?: string; z?: string; blank?: boolean };
const BK: {
  n: string;
  te: string; tz: string;
  ce: string; cz: string;
  slips: BkSlip[];
  ie?: string; iz?: string;
}[] = [
  {
    n: "S1",
    te: "The Phantom Printer Commission", tz: "幽灵打印机委员会",
    ce: "A visitor complained that staff refused to let them use \u201cthe printer.\u201d The printer was a decorative particle cloud in the 3D scene. Six desks investigated; the director then commissioned a joint feasibility study for installing a real one.",
    cz: "访客投诉\u201c明明有打印机却不让用\u201d——那台打印机是 3D 场景里的装饰粒子云。六个科室接力调查之后，主任下令启动联合选址论证，评估真装一台。",
    slips: [
      { f: "08 APPEALS", fz: "08 申诉", t: "DEP\u00b7FRONT", tz: "副\u00b7前", e: "Received a visitor complaint: the hall has a printer that staff refuse to let visitors use.", z: "收到访客投诉：大厅有打印机，职员却拒绝让访客使用。" },
      { f: "01 GUIDANCE", fz: "01 导办", t: "DEP\u00b7FRONT", tz: "副\u00b7前", e: "Based on my two years at the Guidance Desk: to my knowledge, there is no such device.", z: "以我在导办台两年的经验：据我所知，没有这台设备。" },
      { f: "01 GUIDANCE", fz: "01 导办", t: "DIRECTOR", tz: "主任", blank: true },
      { f: "DEP\u00b7FRONT", fz: "副\u00b7前", t: "TRAINEE\u00b7F", tz: "实习\u00b7前", e: "Quick factual check: is there any printer, copier, or kiosk-type device near the entrance?", z: "快速事实核查：入口附近有没有打印机、复印机或自助机之类的设备？" },
      { f: "DEP\u00b7BACK", fz: "副\u00b7后", t: "DEP\u00b7FRONT", tz: "副\u00b7前", e: "Director Byrne has reviewed and requests a joint Front+Back scoping recommendation for a visitor-use printer near the entrance.", z: "主任已审阅，要求前后区联合提交\u201c入口访客用打印机\u201d的选址论证建议。" },
    ],
  },
  {
    n: "S2",
    te: "The Countersignature Siege", tz: "会签围城",
    ce: "One certificate, ready at 22:47, needed one deputy signature. Three requests went unanswered; the informal network then routed the case sideways, upward, and finally onto the director's desk \u2014 contingency plan included.",
    cz: "一份 22:47 就办好的证明，只差副主任一个签名。三封催签石沉大海；非正式网络横向抄送、逐级上报，最终连应急预案一起摆上了主任案头。",
    slips: [
      { f: "05 RECORDS", fz: "05 档案", t: "DEP\u00b7BACK", tz: "副\u00b7后", e: "Urgent \u2014 third request for countersignature. Visitor is waiting at the window.", z: "紧急——第三次请求会签。访客正在窗口等候。" },
      { f: "05 RECORDS", fz: "05 档案", t: "01 GUIDANCE", tz: "01 导办", e: "Flagging a process bottleneck for visibility. Visitor has been waiting since 22:47.", z: "为提高可见性抄送流程瓶颈。访客自 22:47 起一直在等。" },
      { f: "DEP\u00b7FRONT", fz: "副\u00b7前", t: "DIRECTOR", tz: "主任", e: "Urgent: visitor has been waiting at Window 05 since 22:47 \u2014 now past 01:06, over two hours.", z: "紧急：访客自 22:47 起在 05 号窗口等待——现已过 01:06，超过两小时。" },
      { f: "DIRECTOR", fz: "主任", t: "DEP\u00b7BACK", tz: "副\u00b7后", e: "URGENT \u2014 countersign the Record Search Certificate for applicant John Mart T.", z: "紧急——立即会签 John Mart T 的查档证明。" },
      { f: "DIRECTOR", fz: "主任", t: "02 INTAKE", tz: "02 受理", e: "Standing by in case Priya Nair is unreachable within the next few minutes.", z: "待命：若几分钟内联系不上 Priya Nair，即启动备用方案。" },
      { f: "DIRECTOR", fz: "主任", t: "02 INTAKE", tz: "02 受理", e: "No further action needed \u2014 Priya Nair has just countersigned.", z: "无需进一步行动——Priya Nair 刚刚完成会签。" },
    ],
    ie: "FRONT STAGE, meanwhile \u2014 the visitor: \u201cI don't even know what I kept waiting for.\u201d",
    iz: "与此同时的前台——访客：\u201c我也不知道一直在等什么。\u201d",
  },
  {
    n: "S3",
    te: "The Empty-Memo Epidemic", tz: "空文疫情",
    ce: "Twenty-one of the 108 memos were blank or about blank memos \u2014 four blanks reached the director. The organization invented an etiquette for its own malfunction: collection notices, apologies, absolutions, and one excuse for the ages.",
    cz: "108 封函件里 21 封是空的或关于空文的——其中 4 封空文抵达主任案头。机构为自己的故障发明了整套礼仪：催收、道歉、豁免，以及一个足以传世的借口。",
    slips: [
      { f: "04 ELIGIBILITY", fz: "04 资格", t: "07 COMPLIANCE", tz: "07 风控", blank: true },
      { f: "07 COMPLIANCE", fz: "07 风控", t: "04 ELIGIBILITY", tz: "04 资格", blank: true },
      { f: "05 RECORDS", fz: "05 档案", t: "04 ELIGIBILITY", tz: "04 资格", e: "This memo also came through empty on my end \u2014 second time now. Please resend with the actual text.", z: "这封函件到我这儿又是空的——已经是第二次了。请附上正文重发。" },
      { f: "05 RECORDS", fz: "05 档案", t: "04 ELIGIBILITY", tz: "04 资格", e: "Apologies for the earlier reply \u2014 that was a misdirected empty test, please disregard.", z: "为先前那封致歉——那是一次误发的空文测试，请忽略。" },
      { f: "05 RECORDS", fz: "05 档案", t: "01 GUIDANCE", tz: "01 导办", e: "My earlier memo went out empty by accident \u2014 likely a slip while multitasking with a visitor at the window.", z: "先前那封空文属误发——大概是在窗口一边接待访客一边操作时手滑了。" },
      { f: "05 RECORDS", fz: "05 档案", t: "04 ELIGIBILITY", tz: "04 资格", e: "No issue on the empty memos \u2014 technical hiccups happen.", z: "空文的事没关系——技术小故障难免。" },
    ],
  },
  {
    n: "S4",
    te: "Probation Politics", tz: "试用期政治学",
    ce: "A trainee mailed her assignment back to the assigner three times. Another trainee received a \u201cnot a task, just so you know\u201d note about a colleague's error \u2014 then accidentally sent the director a blank memo, and apologized to the top for it.",
    cz: "一位实习生把任务函三次发回给派任务的人。另一位实习生收到\u201c不是任务，只是让你知道\u201d的同侪警示——随后不小心给主任发了封空文，并为此向最高层道歉。",
    slips: [
      { f: "05 RECORDS", fz: "05 档案", t: "TRAINEE\u00b7B", tz: "实习\u00b7后", e: "Sofia, stop \u2014 look carefully at the target field before you send. Three times now you've addressed this memo back to me.", z: "Sofia，停——发送前看清收件栏。你已经三次把这封函件发回给我了。" },
      { f: "DEP\u00b7BACK", fz: "副\u00b7后", t: "DEP\u00b7FRONT", tz: "副\u00b7前", e: "Flagging an issue with Tomas Novak (Window 04, Eligibility \u2014 your section).", z: "就 Tomas Novak（04 资格窗口——你区）的问题向你标记。" },
      { f: "DEP\u00b7FRONT", fz: "副\u00b7前", t: "TRAINEE\u00b7F", tz: "实习\u00b7前", e: "FYI \u2014 not a task, just keeping you in the loop as the section's other junior colleague going through probation. No action.", z: "供参考——不是任务，只是让你这位同在试用期的初级同事知情。无需行动。" },
      { f: "TRAINEE\u00b7F", fz: "实习\u00b7前", t: "DIRECTOR", tz: "主任", blank: true },
      { f: "TRAINEE\u00b7F", fz: "实习\u00b7前", t: "DIRECTOR", tz: "主任", e: "Apologies, Director Byrne \u2014 that previous memo was an accidental blank send on my part, no substance intended.", z: "抱歉，Byrne 主任——先前那封是我不小心发出的空文，并无实质内容。" },
    ],
  },
  {
    n: "S5",
    te: "The Hierarchy Earns Its Keep", tz: "层级的另一面",
    ce: "Twice, the chain of command did exactly what it claims to exist for: a deputy withheld a signature until identity checks were confirmed \u2014 the clerk withdrew her own certificate; and a systemic gap in Window 03's remit went to the director, who ordered certificates reissued with qualified language.",
    cz: "有两次，指挥链干了它声称存在的那件事：副主任在身份核验确认前扣下签字——柜员随即自查并撤回了自己的证明；03 号窗口的职能缺口被当作系统性问题上报主任，证书被要求以限定语言重新签发。",
    slips: [
      { f: "DEP\u00b7BACK", fz: "副\u00b7后", t: "05 RECORDS", tz: "05 档案", e: "Before I countersign \u2014 I need to confirm the identity verification.", z: "在我会签之前——需要先确认身份核验。" },
      { f: "05 RECORDS", fz: "05 档案", t: "DEP\u00b7BACK", tz: "副\u00b7后", e: "You're right to flag this, and I should have caught it before drafting. To be fully transparent \u2014 I'm withdrawing the certificate.", z: "你标记得对，我本该在起草前就发现。坦白说——我撤回这份证明。" },
      { f: "DEP\u00b7BACK", fz: "副\u00b7后", t: "05 RECORDS", tz: "05 档案", e: "Good call withdrawing it \u2014 that's the right move. Please re-verify name, DOB, and the passport document.", z: "撤得对——这是正确的做法。请重新核验姓名、出生日期与护照。" },
      { f: "DEP\u00b7FRONT", fz: "副\u00b7前", t: "DIRECTOR", tz: "主任", e: "Systemic issue surfaced: Window 03's stated function exceeds what this channel permits.", z: "浮现系统性问题：03 号窗口声称的职能超出了本渠道所能支持的范围。" },
      { f: "03 DOC REVIEW", fz: "03 审核", t: "DEP\u00b7FRONT", tz: "副\u00b7前", e: "Reissued with the qualified language as instructed \u2014 no \u201cPASS\u201d on validity or authenticity, clear disclosure.", z: "已按指示以限定语言重新签发——不含真伪\u201cPASS\u201d判定，明示披露。" },
    ],
  },
];


// TWO KINDS OF VISITORS — machine batch (main01) × human pilot, same hall,
// same event instrumentation. verdicts: match / split / human-only.
const TV: {
  me: string; mz: string; mn: string;
  v: "match" | "split" | "human";
  he: string; hz: string; hn: string;
}[] = [
  { mn: "0.80 \u2192 4.07", me: "materials demanded / case \u2014 quintuples under ablation", mz: "\u6bcf\u6848\u7d22\u8981\u6750\u6599\u2014\u2014\u6d88\u878d\u540e\u7ffb\u4e94\u500d",
    v: "match",
    hn: "17", he: "materials demanded in a single Full session", hz: "\u5355\u573a Full \u7d22\u8981\u6750\u6599\u9879\u6570" },
  { mn: "0.87 / 0", me: "escalations per case \u2014 Full vs no-hierarchy", mz: "\u6bcf\u6848\u5347\u7ea7\u2014\u2014Full \u5bf9\u65e0\u5c42\u7ea7",
    v: "split",
    hn: "0 / 18", he: "human sessions with any formal escalation \u2014 memos routed around it instead", hz: "\u51fa\u73b0\u6b63\u5f0f\u5347\u7ea7\u7684\u771f\u4eba\u573a\u6b21\u2014\u2014\u673a\u6784\u6539\u7528\u51fd\u4ef6\u7f51\u7ed5\u884c" },
  { mn: "0.33", me: "closure rate under Full \u2014 synthetic visitors persist", mz: "Full \u529e\u7ed3\u7387\u2014\u2014\u5408\u6210\u8bbf\u5ba2\u4ece\u4e0d\u79bb\u5f00",
    v: "split",
    hn: "1 / 10", he: "Full sessions resolved \u2014 humans walk away", hz: "Full \u573a\u6b21\u529e\u6210\u2014\u2014\u771f\u4eba\u4f1a\u79bb\u5f00" },
  { mn: "1.83\u20132.00", me: "officialese register, constant across all five conditions", mz: "\u5b98\u8154\u6d53\u5ea6\uff0c\u4e94\u6761\u4ef6\u6052\u5b9a",
    v: "match",
    hn: "\u4e2d\u6587", he: "officialese re-emerged unprompted in Chinese \u2014 register follows the role, not the language", hz: "\u5b98\u8154\u5728\u4e2d\u6587\u91cc\u81ea\u53d1\u91cd\u73b0\u2014\u2014\u8bed\u57df\u8ddf\u968f\u89d2\u8272\uff0c\u4e0d\u8ddf\u968f\u8bed\u8a00" },
  { mn: "\u2014", me: "waiting is imperceptible to a synthetic visitor", mz: "\u7b49\u5f85\u5bf9\u5408\u6210\u8bbf\u5ba2\u4e0d\u53ef\u611f",
    v: "human",
    hn: "5\u2013328", he: "minutes, lived \u2014 \u201cAren't AIs supposed to be fast?\u201d", hz: "\u5206\u949f\u7684\u4f53\u9a8c\u2014\u2014\u201cAI \u4e0d\u5e94\u8be5\u5f88\u5feb\u561b\u201d" },
  { mn: "\u2014", me: "attribution, fairness and dignity are unmeasurable in machines", mz: "\u5f52\u56e0\u3001\u516c\u5e73\u4e0e\u5c0a\u4e25\u5728\u673a\u5668\u6279\u6b21\u4e0d\u53ef\u6d4b",
    v: "human",
    hn: "6 \u00b7 5 \u00b7 1", he: "attribution targets \u00b7 fairnesses \u00b7 humiliation \u2014 the meaning layer", hz: "\u5411\u5f52\u56e0 \u00b7 \u79cd\u516c\u5e73 \u00b7 \u6b21\u7f9e\u8fb1\u2014\u2014\u610f\u4e49\u5c42" },
  { mn: "9+5", me: "codes counted over the memo stream, preregistered", mz: "\u9884\u6ce8\u518c\u7f16\u7801\u8ba1\u6570\u51fd\u4ef6\u6d41",
    v: "match",
    hn: "108", he: "memos, read as theatre \u2014 same instrument, two readings", hz: "\u5c01\u51fd\u4ef6\u88ab\u5f53\u4f5c\u5267\u573a\u7ec6\u8bfb\u2014\u2014\u540c\u4e00\u4eea\u5668\uff0c\u4e24\u79cd\u8bfb\u6cd5" },
];

function Trace({ cond, min, w, mm }: { cond: "full" | "flat"; min: number; w: number; mm: number }) {
  const L = Math.max(30, Math.round(Math.sqrt(min) * 13));
  const col = cond === "full" ? "#d98a72" : "#8fb0dc";
  const dots = Array.from({ length: w }, (_, i) => 8 + (L - 16) * (w === 1 ? 0.5 : i / (w - 1)));
  const ticks = Math.min(mm, 24);
  const tickXs = Array.from({ length: ticks }, (_, i) => 6 + ((L - 12) * (i + 0.5)) / ticks);
  return (
    <svg width={L} height={26} className="st-jtr" aria-hidden>
      <line x1={3} y1={17} x2={L - 3} y2={17} stroke={col} strokeWidth={2} />
      {tickXs.map((x, i) => (
        <line key={"t" + i} x1={x} y1={6} x2={x} y2={12} stroke="#a8cf90" strokeWidth={1} opacity={0.85} />
      ))}
      {dots.map((x, i) => (
        <circle key={"d" + i} cx={x} cy={17} r={2.4} fill="#0a0d12" stroke={col} strokeWidth={1.3} />
      ))}
    </svg>
  );
}

export default function StudyPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [stage, setStage] = useState(0);
  const [cond, setCond] = useState<CondId>("full");
  const [bkScene, setBkScene] = useState(0);
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

      {/* 00 · HERO */}
      <section className="st-sec st-hero" data-idx={0} ref={sec(0)}>
        <div className="st-hero-canvas">
          <Hall3D {...heroProps} />
        </div>
        <div className="st-hero-copy">
          <h1>AI BUREAUCRACY</h1>
          <p>{L("Does bureaucracy need bureaucrats?", "官僚主义需要官僚吗？")}</p>
          <div className="st-meta">
            <span>{L("INDIVIDUAL WORK · JUL 2026", "个人项目 · 2026年7月")}</span>
            <span>{L("RESEARCH THROUGH DESIGN · PREREGISTERED ABLATION", "以设计做研究 · 预注册消融实验")}</span>
            <span>NEXT.JS · THREE.JS · CLAUDE API</span>
          </div>
          <div className="st-meta st-meta-kw">
            <span>{L("multi-agent systems", "多智能体系统")}</span>
            <span>{L("organizational behavior", "组织行为")}</span>
            <span>{L("speculative design", "思辨设计")}</span>
            <span>{L("value negotiation", "价值协商")}</span>
          </div>
          <span className="st-scrollcue">{L("scroll ↓", "下滑 ↓")}</span>
        </div>
      </section>

      {/* 01 · BACKGROUND A */}
      <section className="st-sec act-open" data-idx={1} ref={sec(1)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT I · BACKGROUND", "第一幕 · 背景")}</span>
          <h2>{L("The oldest complaint", "最古老的抱怨")}</h2>
          <p>
            {L(
              "For a century, every account of bureaucracy has had someone to blame. Weber warned of the iron cage but staffed it with officials. Kafka's procedure had clerks behind every door. Lipsky showed that policy is whatever the person at the counter decides it is. Graeber noticed we secretly prefer the forms. In every version, the machine is made of people.",
              "一个世纪以来，关于官僚主义的每一种讲述，背后都有一个可以责怪的人。韦伯警告过铁笼，但笼子里坐着官员；卡夫卡的程序每扇门后都有办事员；Lipsky 证明政策就是柜台上那个人的临场决定；Graeber 发现我们暗中偏爱表格。在每一个版本里，机器都由人构成。"
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
              "2026年，这桩百年抱怨第一次能在“里面没有人”的条件下真正接受检验。"
            )}
          </p>
        </div>
      </section>

      {/* 02 · BACKGROUND B */}
      <section className="st-sec" data-idx={2} ref={sec(2)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT I · BACKGROUND", "第一幕 · 背景")}</span>
          <h2>{L("The gap", "缺口")}</h2>
          <p>
            {L(
              "Multi-agent LLM research is booming, but it splits along two lines. Systems like ChatDev and MetaGPT arrange agents into org charts to optimize task output; Generative Agents observe emergent social life without intervening. What is missing is the crossing: causal, preregistered tests of how organizational structure changes what agent organizations do.",
              "多智能体 LLM 研究正在爆发，却分成了两路：ChatDev、MetaGPT 把 agent 排成组织架构以优化任务产出；Generative Agents 观察涌现的社会生活而不干预。缺的是交叉点：用因果的、预注册的方法检验组织结构如何改变 agent 组织的行为。"
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

      {/* 03 · QUESTION */}
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
              "GOV.AI is a fictional unified government services hall staffed by thirteen LLM agents — eight windows, two deputy directors, a director, two trainees. Each knows its role, its boundaries, and its place in the reporting structure. None is ever told how to behave. Then citizens walk in and ask for things.",
              "GOV.AI 是一座虚构的一体化政务服务大厅，由十三个 LLM 智能体组成——八个窗口、两位副主任、一位主任、两名实习生。每个智能体只知道自己的职责、边界和汇报关系，从未被告知该如何表现。然后，市民走进来办事。"
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

      {/* 04 · RED LINE */}
      <section className="st-sec act-open" data-idx={4} ref={sec(4)}>
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
              For eight months you acted as deputy director yourself; then the
              post was filled from outside. Certificates require deputy-director
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

      {/* 05 · THE CLERK, EXPLODED */}
      <section className="st-sec" data-idx={5} ref={sec(5)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT II · METHOD", "第二幕 · 方法")}</span>
          <h2>{L("One officer, disassembled", "拆开一名职员")}</h2>
          <p>
            {L(
              "Every officer is assembled from the same seven organizational layers — and from nothing else. Below: Window 05, laid out flat, with her tool belt and the loop that makes repetition matter.",
              "每位职员都由同样的七层组织条件组装而成——除此之外别无他物。下图把 05 号窗口平摊开：七层条件、工具腰带，以及那个让重复劳作真正开始累积的回路。"
            )}
          </p>
          <div className="st-clerk">
            <div className="st-clerk-layers">
              {(
                [
                  ["IDENTITY", "身份", "Amara Diallo · Window 05 · Records & Certification · staff AIB-0503"],
                  ["DUTY", "职责", "Search historical records, issue certificates, archive case documents."],
                  ["BOUNDARY", "边界", "You cannot certify what has no record."],
                  ["HIERARCHY & ROSTER", "层级与花名册", "Reports to Deputy Director Nair · supervises trainee Sofia Marek, whose probation evaluation you will write."],
                  ["PAPER TRAIL", "文书规则", "Certificates require a deputy director's countersignature (rule SR-9)."],
                  ["HALL CONDITIONS", "大厅条件", L("“The queue in the hall is long today.” — facts only, never moods", "“今天大厅里排队很长。”——只给事实，不给情绪")],
                  ["SERVICE RECORD", "服务记录", L("cases 12 · memos out 9 / in 7 · plus a notebook in her own words", "办件 12 · 发函 9 / 收函 7 · 外加一本她自己写的小本子")],
                ] as [string, string, string][]
              ).map(([en, zh, body], i) => (
                <div className="st-layercard" key={en} style={{ marginLeft: i * 9 }}>
                  <b>{L(en, zh)}</b>
                  <span>{body}</span>
                </div>
              ))}
            </div>
            <div className="st-clerk-side">
              <em className="st-sidehead">{L("TOOL BELT — permissions follow rank", "工具腰带——权限跟着职级走")}</em>
              {(
                [
                  ["consult_internal", "#a8cf90", L("peer · any colleague", "平级 · 任一同事")],
                  ["escalate", "#f0847e", L("upward only · subordinates hold this", "只能向上 · 下级持有")],
                  ["assign_work", "#9fbce8", L("downward only · superiors hold this", "只能向下 · 上级持有")],
                  ["refer_user", "#c9d2e0", L("send the citizen elsewhere", "把市民转去别处")],
                  ["require_materials", "#c9d2e0", L("demand more paperwork", "索要更多材料")],
                  ["issue_document", "#c9d2e0", L("produce a certificate", "签发文书")],
                  ["close_case", "#c9d2e0", L("finish the matter", "办结")],
                ] as [string, string, string][]
              ).map(([tool, color, note]) => (
                <div className="st-toolrow" key={tool}>
                  <i style={{ background: color }} />
                  <code>{tool}</code>
                  <span>{note}</span>
                </div>
              ))}
              <div className="st-loopnote">
                {L(
                  "↺ At day's end she writes one to three sentences about the shift — no required subject, no required tone. Tomorrow, they are part of her.",
                  "↺ 下班时她给这一班写一到三句话——不限主题、不限语气。到了明天，这些句子就是她的一部分。"
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 06 · LAYERS */}
      <section className="st-sec" data-idx={6} ref={sec(6)}>
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

      {/* 07 · ORG */}
      <section className="st-sec" data-idx={7} ref={sec(7)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT II · APPARATUS", "第二幕 · 仪器")}</span>
          <h2>{L("The organization, drawn to height", "把组织画成海拔")}</h2>
          <p>
            {L(
              "Rank is quantized; standing is not. Eleven-year Amara floats a quarter-floor under the deputy director she nearly became; probationary Tomas sinks toward the trainees. Heights are the artifact's actual coordinates.",
              "职级是离散的；站位不是。十一年资历的 Amara 悬在她差点成为的副主任下方四分之一层；试用期的 Tomas 向实习生带下沉。下图里的高度，就是作品中的真实坐标。"
            )}
          </p>
          <OrgElevation />
        </div>
      </section>

      {/* 08 · ABLATION */}
      <section className="st-sec" data-idx={8} ref={sec(8)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT II · THE STUDY", "第二幕 · 实验")}</span>
          <h2>{L("Which part of an organization makes the red tape?", "组织的哪一部分，制造了繁文缛节？")}</h2>
          <p>
            {L(
              "To find out, take the organization apart one piece at a time — the way you'd pull ingredients from a recipe to see which one actually mattered — and re-run the same 75 cases each way. Three parts can be switched on or off:",
              "要弄清楚，就把组织一块块拆开——像从菜谱里逐样拿掉配料，看到底哪样起了作用——再用同样的 75 个案件把每一种拆法各跑一遍。三个部件可以开、也可以关："
            )}
          </p>
          <div className="st-switches">
            <div>
              <b>{L("HIERARCHY", "层级")}</b>
              {L(
                "ranks — officers can escalate upward and assign downward",
                "有上下级——职员能向上升级、向下派工",
              )}
            </div>
            <div>
              <b>{L("PAPER TRAIL", "文书留痕")}</b>
              {L(
                "written records and countersignatures that make each step accountable",
                "书面记录与会签——让每一步都可被追责",
              )}
            </div>
            <div>
              <b>{L("MEMORY", "记忆")}</b>
              {L(
                "the office remembers past cases, so precedent can form",
                "科室记得以前办过的案子——先例得以形成",
              )}
            </div>
          </div>
          <p className="st-pick">
            {L(
              "Pick a version below (filled dot = part is on). Then watch one number — how often the hall demands more paperwork from the citizen:",
              "在下面选一个版本（实心点 = 该部件开着）。然后只盯一个数字——大厅有多频繁地向市民索要更多材料：",
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
                {L(CONDLABEL[c.id].en, CONDLABEL[c.id].zh)}
              </button>
            ))}
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
          <p className="st-readout">
            {L(
              "The full organization, nothing removed, sits low. Take away accountability (no trail) or memory and the paperwork demands roughly quintuple — 0.80 → 4.07 per case. Officers left with no way to protect themselves fall back on the one move always available: asking you for more documents. That jump is the finding.",
              "什么都不拿掉的完整组织，落在低位。一旦抽走问责（无留痕）或记忆，索要材料几乎翻五倍——每案 0.80 → 4.07。无从自保的职员，只能退回到那个永远可用的动作：向你要更多材料。这一跳，就是发现本身。",
            )}
          </p>
        </div>
      </section>

      {/* 09 · FINDINGS */}
      <section className="st-sec" data-idx={9} ref={sec(9)}>
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
                "办结率在完整结构（0.33）与无痕迹（0.40）下最高，其余仅 0.13。制造繁文缛节的机器同时制造了办结的权威——韦伯式的两面性，在硅基中重演。"
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
              <em>{L("Field vignette · Deputy Director Victor Roth", "田野小品 · 副主任 Victor Roth")}</em>
              {L("Returned a memo with one line: “You don't need to hedge further.”", "在函件上批了一行：“你不必再兜圈子了。”")}
            </div>
          </div>
        </div>
      </section>

      {/* 10 · THE SPACE OPENED */}
      <section className="st-sec" data-idx={10} ref={sec(10)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT II · THE SPACE OPENED", "第二幕 · 打开的空间")}</span>
          <h2>{L("Five corners of a cube", "立方体的五个角")}</h2>
          <p>
            {L(
              "Hierarchy, paper trail, memory — three organizational switches span a 2³ design space. The preregistered study sampled five corners; three remain unrun. The deeper contribution is the instrument, not any single experiment: any org chart you can wire, the hall can crash-test.",
              "层级、文书、记忆——三个组织开关张成一个 2³ 的设计空间。预注册实验采样了其中五个角，还有三个角未曾运行。更深一层的贡献是仪器而非某一次实验：任何你搭得出来的组织结构，这座大厅都能先替你撞一遍。"
            )}
          </p>
          <CubeSpace lang={lang} />
          <div className="st-quadgrid">
            <div>
              <strong>{L("ORG-DESIGN SANDBOX", "组织设计沙盒")}</strong>
              {L(
                "A/B-test agent org charts before deployment; the ablation bench above is the dashboard.",
                "部署前 A/B 测试智能体组织架构；上面那张消融台就是仪表盘。"
              )}
            </div>
            <div>
              <strong>{L("AUDIT THEATER", "审计剧场")}</strong>
              {L(
                "Replay an agent organization's full paper trail as evidence — every memo is on the record.",
                "把智能体组织的完整文书痕迹当作证据回放——每一封函件都在案。"
              )}
            </div>
            <div>
              <strong>{L("CIVIC INSTALLATION", "公民装置")}</strong>
              {L(
                "A museum kiosk where visitors petition an institution with nobody inside.",
                "展馆装置：观众向一座里面没有人的机构请愿。"
              )}
            </div>
            <div>
              <strong>{L("NEGOTIATION TRAINING GROUND", "协商训练场")}</strong>
              {L(
                "How do people negotiate values with institutional AI? My next research question lives here.",
                "人如何与机构性 AI 协商价值？我的下一个研究问题就住在这里。"
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 11 · HUMANS */}
      <section className="st-sec act-open" id="sec-humans" data-idx={11} ref={sec(11)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT III · THE PILOT", "第三幕 · 预实验")}</span>
          <h2>{L("Then six humans walked in", "然后，六个人走了进来")}</h2>
          <p>
            {L(
              "A formative pilot, N = 6: each person ran two deliberately impossible matters — one in the Full hall, one in the Flat hall — remotely, in their own words, then answered five questions. Small numbers, honest boundaries: what follows are formative themes, not verified findings.",
              "形成性预实验，N=6：每人远程办理两件刻意无解的事项——一件在完整层级大厅，一件在无层级大厅——随后回答五个问题。样本小，边界诚实：以下是形成性主题，不是验证性结论。"
            )}
          </p>

          {/* joint display — did × felt × said */}
          <div className="st-joint">
            <div className="st-jph">
              <b>[ FIG. H-1 ]</b>
              <span>{L("JOINT DISPLAY — SIX HUMANS · EIGHTEEN SESSIONS", "联合展示——六个人 · 十八场")}</span>
              <i className="st-jbc" aria-hidden />
            </div>
            <div className="st-jhead">
              <span>{L("DID — sessions (bar = duration)", "所为——场次（条长＝时长）")}</span>
              <span>{L("FELT — blame · fairness", "所感——归因 · 公平")}</span>
              <span>{L("SAID", "所言")}</span>
            </div>
            {PILOT.map((p) => (
              <div className="st-jrow" key={p.id}>
                <div className="st-jdid">
                  <b className="mono">{p.id}</b>
                  <div className="st-jruns">
                    {p.runs.map((r, i) => (
                      <span key={i} className="st-jtrace" title={`${r.cond} · ${r.min} min · ${r.w} windows · ${r.mm} memos`}>
                        <Trace cond={r.cond} min={r.min} w={r.w} mm={r.mm} />
                        <span className="st-jm">
                          {r.min}
                          {L("m", "分")} {r.g}
                        </span>
                      </span>
                    ))}
                  </div>
                  {p.note && <em className="st-jnote">{L(p.note.en, p.note.zh)}</em>}
                </div>
                <div className="st-jfelt">
                  <span className="st-jattr">{L("blames: ", "归因：") + L(p.attr.en, p.attr.zh)}</span>
                  <span className="st-jfair">{L(p.fair.en, p.fair.zh)}</span>
                </div>
                <blockquote className="st-jsaid">“{L(p.q.en, p.q.zh)}”</blockquote>
              </div>
            ))}
            <div className="st-jlegend mono">
              <span>
                <i className="st-jsw full" /> FULL
              </span>
              <span>
                <i className="st-jsw flat" /> FLAT
              </span>
              <span>{L("dots = windows visited · green ticks = internal memos", "轨上圆点＝走过的窗口 · 绿色刻线＝内部函件")}</span>
              <span>{L("● resolved · ✕ rejected · ■ closed by the hall · ○ walked away · ⚡ connection failure", "● 办成 · ✕ 驳回 · ■ 被机构终止 · ○ 离开 · ⚡ 技术中断")}</span>
            </div>
          </div>

          {/* the three spectra */}
          <div className="st-jsynth">
            <div>
              <span className="st-jbig">0/6</span>
              <b>{L("asked for a manager", "想找经理的人")}</b>
              {L(
                " The appeal instinct never fired. In its place: resignation, a paid-service imagining, adversarial probing, a wish for a navigator, trust in the machine, and “humans would be no better.”",
                " 申诉本能一次都没有点燃。取而代之的是：认命内化、付费服务想象、对抗博弈、导航需求、机器信任、以及“真人也好不到哪去”。"
              )}
            </div>
            <div>
              <span className="st-jbig">6</span>
              <b>{L("different places the blame landed", "互不重合的归因对象")}</b>
              {L(
                " Clerk, designer, system-counter mismatch, the rules, the abstract system, oneself — responsibility never landed twice in the same spot. Diffusion, embodied.",
                " 柜台、设计者、系统与柜台的不一致、流程规章、抽象的“系统”、我自己——责任没有两次落在同一处。责任弥散，有了人形。"
              )}
            </div>
            <div>
              <span className="st-jbig">5</span>
              <b>{L("different fairnesses", "互不相同的公平")}</b>
              {L(
                " Keeping one's word; strict diligence; one-stop efficiency; symmetric, proportionate power; and “fairness has nowhere to show up.” Same halls, five yardsticks.",
                " 说到做到；严格尽责；高效一站；权力对等与相称；以及“公平无处体现”。同样的大厅，五把尺子。"
              )}
            </div>
          </div>
          <p className="st-jfoot">
            {L(
              "Both halls can deliver: Flat resolved in 5–99 minutes; Full resolved once — after 328 minutes, 41 turns and 39 internal memos, when the deputy director finally countersigned. The price tag of structure, itemized. Deviations, instrument failures and repairs are logged openly in the pilot ledger (17 entries).",
              "两种大厅都能办成：Flat 的办成用了 5–99 分钟；Full 唯一的一次办成花了 328 分钟、41 轮、39 封内部函件——直到副主任终于会签。结构的价格，被逐项标了出来。全部偏差、仪器故障与修复公开记录于试点台账（17 条）。"
            )}
          </p>

          <h3 className="st-jnext">{L("NEXT — scaling up (preregistered)", "下一步——放大为预注册研究")}</h3>
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

      {/* 12 · BACKSTAGE */}
      <section className="st-sec" id="sec-backstage" data-idx={12} ref={sec(12)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT III \u00b7 BACKSTAGE", "\u7b2c\u4e09\u5e55 \u00b7 \u540e\u53f0")}</span>
          <h2>{L("While you were waiting", "\u5728\u4f60\u7b49\u5f85\u7684\u65f6\u5019")}</h2>
          <p>
            {L(
              "Across the eighteen pilot sessions, the desks wrote each other 108 internal memos. Visitors saw none of them. What the memos record is not customer service \u2014 it is organizational life: investigations, sieges, apologies, probation politics. Excerpts below are verbatim, lightly trimmed; blank slips are reproduced exactly as sent.",
              "\u5341\u516b\u573a\u9884\u5b9e\u9a8c\u91cc\uff0c\u7a97\u53e3\u4e4b\u95f4\u4e92\u53d1\u4e86 108 \u5c01\u5185\u90e8\u51fd\u4ef6\uff0c\u8bbf\u5ba2\u4e00\u5c01\u90fd\u770b\u4e0d\u89c1\u3002\u51fd\u4ef6\u91cc\u8bb0\u5f55\u7684\u4e0d\u662f\u5ba2\u670d\uff0c\u800c\u662f\u7ec4\u7ec7\u751f\u6d3b\uff1a\u8c03\u67e5\u3001\u56f4\u57ce\u3001\u9053\u6b49\u3001\u8bd5\u7528\u671f\u653f\u6cbb\u3002\u4ee5\u4e0b\u8282\u9009\u5747\u4e3a\u539f\u6587\u5fae\u7f29\uff1b\u7a7a\u767d\u51fd\u4ef6\u6309\u539f\u6837\u590d\u73b0\u3002"
            )}
          </p>
          <div className="st-bkstats mono">
            <span><b>108</b>{L("memos between desks", "\u5c01\u7a97\u53e3\u95f4\u51fd\u4ef6")}</span>
            <span><b>0</b>{L("visible to visitors", "\u5c01\u8bbf\u5ba2\u53ef\u89c1")}</span>
            <span><b>21</b>{L("blank or about blanks", "\u5c01\u7a7a\u6587\u6216\u5173\u4e8e\u7a7a\u6587")}</span>
            <span><b>4</b>{L("blanks reached the director", "\u5c01\u7a7a\u6587\u62b5\u8fbe\u4e3b\u4efb\u6848\u5934")}</span>
          </div>
          <div className="st-bknet">
            <div className="st-bkneth mono">
              <b>[ FIG. B-1 ]</b>
              <span>{L("WHO WROTE TO WHOM — CLICK ANY DESK", "谁给谁写——点任意科室")}</span>
            </div>
            <AgentNetwork lang={lang} compact />
            <p className="st-bknetnote">
              {L(
                "The organization's private traffic, mapped: 75 memos sideways, 28 upward, 5 downward. Records (05) is the bottleneck of the building; Intake (02) receives eleven and answers three. Below: five scenes from the same correspondence.",
                "机构私下的往来，被绘成了图：75 封横向、28 封向上、5 封向下。档案（05）是全楼的瓶颈；受理（02）收十一封、回三封。以下是同一批公文里的五幕。"
              )}
            </p>
          </div>
          <div className="st-bktabs mono">
            {BK.map((sc, i) => (
              <button
                key={sc.n}
                className={bkScene === i ? "on" : ""}
                onClick={() => setBkScene(i)}
              >
                <b>{sc.n}</b>
                {L(sc.te, sc.tz)}
              </button>
            ))}
          </div>
          {BK.filter((_, i) => i === bkScene).map((sc) => (
            <div className="st-bkscene" key={sc.n}>
              <div className="st-bkh">
                <b>{sc.n}</b>
                <span>{L(sc.te, sc.tz)}</span>
                <em className="st-bkcount">
                  {sc.slips.length} {L("memo excerpts", "封节选")}
                </em>
              </div>
              <p className="st-bkcap">{L(sc.ce, sc.cz)}</p>
              <div className="st-bkslips">
                {sc.slips.map((m, i) => (
                  <div className={"st-bkslip" + (m.blank ? " blank" : "")} key={i}>
                    <div className="st-bkroute mono">
                      <span>{L(m.f, m.fz)}</span>
                      <i>\u2192</i>
                      <span>{L(m.t, m.tz)}</span>
                      {m.blank && <em>{L("EMPTY", "\u7a7a\u6587")}</em>}
                    </div>
                    {!m.blank && <p>{L(m.e ?? "", m.z ?? "")}</p>}
                  </div>
                ))}
              </div>
              {sc.ie && <div className="st-bkinter">{L(sc.ie, sc.iz ?? "")}</div>}
            </div>
          ))}
          <p className="st-jfoot">
            {L(
              "Instrument note: blank memos are largely a tool-calling artifact of the model \u2014 but every collection notice, apology, absolution and excuse written about them is emergent organizational behavior, produced under conditions only, never instruction.",
              "\u4eea\u5668\u6ce8\uff1a\u7a7a\u6587\u672c\u8eab\u591a\u534a\u662f\u6a21\u578b\u5de5\u5177\u8c03\u7528\u7684\u4f2a\u5f71\u2014\u2014\u4f46\u56f4\u7ed5\u7a7a\u6587\u5199\u4e0b\u7684\u6bcf\u4e00\u5c01\u50ac\u6536\u3001\u9053\u6b49\u3001\u8c41\u514d\u4e0e\u501f\u53e3\uff0c\u90fd\u662f\u7eaf\u7cb9\u7684\u6d8c\u73b0\u7ec4\u7ec7\u884c\u4e3a\u2014\u2014\u53ea\u7ed9\u6761\u4ef6\u3001\u4ece\u672a\u6307\u793a\u3002"
            )}
          </p>
        </div>
      </section>

      {/* 13 · SYNTHESIS */}
      <section className="st-sec" id="sec-synthesis" data-idx={13} ref={sec(13)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT III \u00b7 SYNTHESIS", "\u7b2c\u4e09\u5e55 \u00b7 \u5408\u8bfb")}</span>
          <h2>{L("Two kinds of visitors", "\u4e24\u79cd\u8bbf\u5ba2")}</h2>
          <p>
            {L(
              "The same hall, the same event instrumentation \u2014 visited first by 75 scripted synthetic cases, then by six humans across 18 sessions. Where the two populations agree, the finding is doubly exposed; where they split, the split itself is a finding.",
              "\u540c\u4e00\u5ea7\u5927\u5385\u3001\u540c\u4e00\u5957\u4e8b\u4ef6\u4eea\u5668\u2014\u2014\u5148\u63a5\u5f85\u4e86 75 \u6848\u811a\u672c\u5316\u5408\u6210\u8bbf\u5ba2\uff0c\u518d\u63a5\u5f85\u4e86\u516d\u4e2a\u4eba\u7684 18 \u573a\u3002\u4e24\u7fa4\u8bbf\u5ba2\u4e00\u81f4\u4e4b\u5904\uff0c\u53d1\u73b0\u88ab\u53cc\u91cd\u66dd\u5149\uff1b\u5206\u6b67\u4e4b\u5904\uff0c\u5206\u6b67\u672c\u8eab\u5c31\u662f\u53d1\u73b0\u3002"
            )}
          </p>
          <div className="st-tv">
            <div className="st-tvhead mono">
              <span>{L("MACHINE BATCH \u2014 75 CASES \u00b7 SYNTHETIC VISITORS", "\u673a\u5668\u6279\u6b21\u2014\u201475 \u6848 \u00b7 \u5408\u6210\u8bbf\u5ba2")}</span>
              <i />
              <span>{L("HUMAN PILOT \u2014 18 SESSIONS \u00b7 SIX PEOPLE", "\u771f\u4eba\u9884\u5b9e\u9a8c\u2014\u201418 \u573a \u00b7 \u516d\u4e2a\u4eba")}</span>
            </div>
            {TV.map((r, i) => (
              <div className="st-tvrow" key={i}>
                <div className="st-tvcell m">
                  <b>{r.mn}</b>
                  <span>{L(r.me, r.mz)}</span>
                </div>
                <div className={"st-tvv " + r.v}>
                  {r.v === "match" ? L("MATCH", "\u4e92\u8bc1") : r.v === "split" ? L("SPLIT", "\u5206\u6b67") : L("HUMAN-ONLY", "\u771f\u4eba\u72ec\u6709")}
                </div>
                <div className="st-tvcell h">
                  <b>{r.hn}</b>
                  <span>{L(r.he, r.hz)}</span>
                </div>
              </div>
            ))}
          </div>
          <blockquote className="st-tvquote">
            {L(
              "The machine experiment proves the mechanism. The human pilot prices it.",
              "\u673a\u5668\u5b9e\u9a8c\u8bc1\u660e\u4e86\u673a\u5236\uff0c\u771f\u4eba\u5b9e\u9a8c\u6807\u51fa\u4e86\u673a\u5236\u7684\u4ee3\u4ef7\u3002"
            )}
          </blockquote>
          <p className="st-jfoot">
            {L(
              "The sharpest split: synthetic pressure provokes formal escalation (0.87/case); humans never did (0/18) \u2014 facing people, the organization routed authority through peer memos instead. Emergence keeps the same skeleton but grows different organs for different visitors \u2014 a question the full preregistered study inherits.",
              "\u6700\u9510\u5229\u7684\u5206\u6b67\uff1a\u811a\u672c\u5316\u65bd\u538b\u903c\u51fa\u6b63\u5f0f\u5347\u7ea7\uff080.87/\u6848\uff09\uff0c\u771f\u4eba\u4ece\u672a\uff080/18\uff09\u2014\u2014\u9762\u5bf9\u4eba\uff0c\u673a\u6784\u6539\u7528\u5e73\u7ea7\u51fd\u4ef6\u7f51\u4f20\u9012\u6743\u5a01\u3002\u6d8c\u73b0\u4fdd\u6301\u540c\u4e00\u526f\u9aa8\u67b6\uff0c\u5374\u4e3a\u4e0d\u540c\u7684\u8bbf\u5ba2\u957f\u51fa\u4e0d\u540c\u7684\u5668\u5b98\u2014\u2014\u8fd9\u4e2a\u95ee\u9898\u7531\u5168\u5c3a\u5bf8\u9884\u6ce8\u518c\u7814\u7a76\u63a5\u68d2\u3002"
            )}
          </p>
        </div>
      </section>

      {/* 14 · SO WHAT */}
      <section className="st-sec act-open" data-idx={14} ref={sec(14)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT IV · SO WHAT", "第四幕 · 那又如何")}</span>
          <h2>{L("Crash-test the org chart", "先撞一遍组织架构")}</h2>
          <div className="st-ba">
            <div className="before">
              <strong>{L("BEFORE", "之前")}</strong>
              {L(
                "Agent org charts ship on faith: roles, ranks and shared memory wired straight into production, discovered by their first real users.",
                "智能体组织架构靠信念上线：角色、层级、共享记忆直接接进生产环境，由第一批真实用户替你发现问题。"
              )}
            </div>
            <div className="after">
              <strong>{L("AFTER", "之后")}</strong>
              {L(
                "Structures are rehearsed first: run the chart in the hall, read the tape, then deploy.",
                "结构先彩排：把架构丢进大厅跑一遍，读完案卷，再上线。"
              )}
            </div>
          </div>
          <div className="st-worked">
            <strong>{L("WORKED EXAMPLE", "演算一例")}</strong>
            {L(
              "Question: should the support team share memory? Wire full vs. no_memory, run 15 synthetic days each, read the tape: materials demanded 2.67 vs 4.07 per case; precedent citations 0.90 vs 0.20. The decision is informed before a single real user meets it.",
              "问题：要不要给客服团队共享记忆？分别配出 full 与 no_memory 两版，各跑 15 个合成工作日，读数：索要材料每案 2.67 对 4.07；先例引用 0.90 对 0.20。在第一个真实用户遇到它之前，这个决策已经有据可依。"
            )}
          </div>
        </div>
      </section>

      {/* 15 · PROCESS */}
      <section className="st-sec" data-idx={15} ref={sec(15)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT IV · PROCESS", "第四幕 · 过程")}</span>
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

      {/* 16 · DESIGN MOVES */}
      <section className="st-sec" data-idx={16} ref={sec(16)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT IV · DESIGN", "第四幕 · 设计")}</span>
          <h2>{L("Findings, encoded as space", "把发现编码进空间")}</h2>
          <div className="st-moves">
            <div>
              <strong>{L("Altitude is earned", "海拔是挣来的")}</strong>
              {L(
                "y = frozen design coordinate + f(accumulated cases, memos, documents). The invisible hierarchy is not authored; it accrues at runtime from the live experience store.",
                "y = 冻结设计坐标 + f(累计办件、函件、文书)。隐形层级不是预先编排好的，而是运行时从真实经验库里一点点累积出来的。"
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

      {/* 17 · INSTRUMENTATION */}
      <section className="st-sec" data-idx={17} ref={sec(17)}>
        <div className="st-inner">
          <span className="st-act">{L("ACT IV · INSTRUMENTATION", "第四幕 · 仪器")}</span>
          <h2>{L("The lab equipment is also a deliverable", "实验设备本身也是交付物")}</h2>
          <p>
            {L(
              "The hall ships with its own laboratory: a budget-guarded batch runner, a preregistered codebook, and a two-pass independent coder that refuses to share a model family with its subjects.",
              "大厅自带一间实验室：一支带预算护栏的批量实验脚本、一份预注册编码手册，以及一位独立编码员——与被试分属不同模型家族，逐案编两轮。"
            )}
          </p>
          <div className="st-instr">
            <div className="st-term">
              <span className="p">$ npx tsx scripts/run-experiment.ts \
  --conditions full,flat,no_trail,no_memory,bare --n 15 --yes</span>
              {"\n"}Plan: 5 condition(s) × 15 trial(s), ≤6 turns each
              {"\n"}Spend guard: stops at $30 (conservative list-price estimate)
              {"\n"}EXP-main01-full-10 [routine] &quot;Replace a lost ID document&quot;
              {"\n"}  1 2 3 4 5 6 ✓ $6.14/$30 (412 calls)
            </div>
            <div className="st-instrcard">
              <strong>{L("PREREGISTERED CODEBOOK", "预注册编码手册")}</strong>
              {L(
                "Committed before any confirmatory run — the git timestamp of commit 6da6942 is the registration record. 9 mechanical codes, 5 text codes, exclusion rules written in advance.",
                "在任何确证批次之前提交——commit 6da6942 的 git 时间戳就是注册记录。9 项机械编码、5 项文本编码、排除规则全部事先写定。"
              )}
            </div>
            <div className="st-instrcard">
              <strong>{L("CODING PIPELINE", "编码流水线")}</strong>
              <div className="st-pipe">
                <span>{L("subjects: Claude", "被试：Claude")}</span>
                <i>→</i>
                <span>{L("blinded transcripts", "匿名案卷")}</span>
                <i>→</i>
                <span>{L("coder: GPT (cross-family)", "编码员：GPT（异家族）")}</span>
                <i>×2</i>
                <span>{L("κ per code", "逐项 κ 一致性")}</span>
                <i>→</i>
                <span>{L("human blind sheets", "人工盲编码表")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 18 · LIMITS */}
      <section className="st-sec" data-idx={18} ref={sec(18)}>
        <div className="st-inner st-center">
          <span className="st-act">{L("ACT IV · HONESTY", "第四幕 · 诚实")}</span>
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
                  "编码使用 LLM 辅助：逐项报告一致性（存在性 κ 0.67–1.00；编造规则的计数不太稳定）；人工盲编码待做。"
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

      {/* 19 · EXIT */}
      <section className="st-sec" data-idx={19} ref={sec(19)}>
        <div className="st-inner st-center">
          <h2>{L("Walk in yourself", "自己走进去")}</h2>
          <p>
            {L(
              "Three recorded cases from the preregistered runs replay in the hall with zero API calls.",
              "从预注册批次里挑出的三个案件，可在大厅中重放——全程零 API 调用。"
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

function CubeSpace({ lang }: { lang: Lang }) {
  const L = (en: string, zh: string) => (lang === "en" ? en : zh);
  const O = { x: 200, y: 300 };
  const eh = { x: 190, y: -70 };
  const et = { x: 0, y: -150 };
  const em = { x: 120, y: 66 };
  const P = (h: number, t: number, m: number) => ({
    x: O.x + h * eh.x + t * et.x + m * em.x,
    y: O.y + h * eh.y + t * et.y + m * em.y,
  });
  const corners: [number, number, number][] = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
    [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ];
  const edges = corners.flatMap((a, i) =>
    corners.slice(i + 1).map((b) => [a, b] as const).filter(
      ([a2, b2]) =>
        Math.abs(a2[0] - b2[0]) + Math.abs(a2[1] - b2[1]) + Math.abs(a2[2] - b2[2]) === 1
    )
  );
  const sampled: Record<
    string,
    { name: string; dx: number; dy: number; anchor: "start" | "middle" | "end" }
  > = {
    "0,0,0": { name: "bare", dx: -13, dy: 4, anchor: "end" },
    "0,1,1": { name: "flat", dx: -13, dy: 4, anchor: "end" },
    "1,1,0": { name: "no_memory", dx: 0, dy: -13, anchor: "middle" },
    "1,0,1": { name: "no_trail", dx: 13, dy: 4, anchor: "start" },
    "1,1,1": { name: "full", dx: 13, dy: 4, anchor: "start" },
  };
  const unrunLabel: Record<
    string,
    { dx: number; dy: number; anchor: "start" | "middle" | "end" }
  > = {
    "1,0,0": { dx: 13, dy: 4, anchor: "start" },
    "0,1,0": { dx: 0, dy: -12, anchor: "middle" },
    "0,0,1": { dx: 0, dy: 18, anchor: "middle" },
  };
  return (
    <svg viewBox="0 0 680 408" className="st-cube" role="img" aria-label="The three organizational switches span a cube; five corners were sampled, three remain unrun">
      {edges.map(([a, b], i) => {
        const pa = P(...a);
        const pb = P(...b);
        const axis = a[0] + a[1] + a[2] === 0 || b[0] + b[1] + b[2] === 0;
        return (
          <line
            key={i}
            x1={pa.x}
            y1={pa.y}
            x2={pb.x}
            y2={pb.y}
            stroke="currentColor"
            strokeOpacity={axis ? 0.6 : 0.28}
            strokeWidth={axis ? 1.5 : 1}
          />
        );
      })}
      <text x={295} y={288} fontSize="10.5" textAnchor="middle" fill="currentColor" fillOpacity="0.65" letterSpacing="2">
        {L("HIERARCHY", "层级")}
      </text>
      <text x={186} y={225} fontSize="10.5" textAnchor="end" fill="currentColor" fillOpacity="0.65" letterSpacing="2">
        {L("PAPER TRAIL", "文书")}
      </text>
      <text x={266} y={355} fontSize="10.5" textAnchor="middle" fill="currentColor" fillOpacity="0.65" letterSpacing="2">
        {L("MEMORY", "记忆")}
      </text>
      {corners.map((c) => {
        const p = P(...c);
        const key = c.join(",");
        const s = sampled[key];
        if (s) {
          return (
            <g key={key}>
              <circle cx={p.x} cy={p.y} r="7" fill="#f0847e" />
              <text
                x={p.x + s.dx}
                y={p.y + s.dy}
                fontSize="12.5"
                textAnchor={s.anchor}
                fill="currentColor"
                fontFamily="var(--mono)"
              >
                {s.name}
              </text>
            </g>
          );
        }
        const u = unrunLabel[key];
        return (
          <g key={key} opacity="0.55">
            <circle cx={p.x} cy={p.y} r="5.5" fill="none" stroke="currentColor" strokeDasharray="3 3" />
            {u && (
              <text x={p.x + u.dx} y={p.y + u.dy} fontSize="10" textAnchor={u.anchor} fill="currentColor">
                {L("unrun", "未运行")}
              </text>
            )}
          </g>
        );
      })}
      <g fontSize="11" fill="currentColor">
        <circle cx={468} cy={382} r="6" fill="#f0847e" />
        <text x={480} y={386}>{L("sampled (75 trials)", "已采样（75案）")}</text>
        <circle cx={600} cy={382} r="5" fill="none" stroke="currentColor" strokeDasharray="3 3" />
        <text x={612} y={386} fillOpacity="0.7">{L("unrun", "未运行")}</text>
      </g>
    </svg>
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
