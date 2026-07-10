# AI Bureaucracy — 项目上下文

思辨设计（Speculative Design）/ 设计研究项目的交互原型。**产品面向全球观众，英文为主要设计语言**；本文档用中文（给研究者/开发期阅读）。

## 项目是什么

一个仿真的 "GOV.AI — Unified Government Services" 政务服务大厅：8 个窗口全部由真实的 AI Agent（Claude API 调用）值守。访客带着一件事走进大厅，第一人称跑窗口；Agent 之间互发内部函件。全程留痕，最后由场外观察员生成给设计师的分析。

核心研究问题：

> 官僚主义是人类文化的产物，还是组织结构的必然涌现？

## 实验红线（最重要的约束）

**被试层（8 个窗口 Agent）的 system prompt 和工具描述里，不能出现任何引导官僚行为的语句。**

- 不能写"要谨慎/要推诿/要多要材料/怕担责"之类的行为或性格指令。
- 只能提供：组织身份（科室、职责、边界、可开具文书）、组织条件（留痕、问责、通讯录）、与工作行为无关的人性化细节（绿萝、长假、工龄）。
- 工具描述只说明操作是什么，不暗示何时"应该"使用。
- 修改 `lib/agents.ts` 时逐句自查。
- **注意**：曾讨论过"窗口答复应简明"的服务规范，用户明确决定**不加**——答复长度也是涌现观察项，交互冗长只靠 UX 缓解。

### 刺激物层 vs 被试层

`lib/visitors.ts` 的合成办事人是**刺激物**，不是被试——它们的人设**可以**自由规定行为（难缠、循环申诉、拒不配合）。观察员报告已被告知：分析对象永远是组织一侧，办事人行为是实验输入。两层绝不能混淆：给被试加条件要过红线审查，给刺激物加设定不用。

## 语言策略

- **英文是主要设计素材**：UI、Agent 对话、文书、观察员报告、办件档案全部英文。
- 办件档案（Agent 的组织记忆）永远单语英文，保证实验一致性。
- 中文只存在于：`lib/i18n.ts` 的 ZH 词典（UI 标签翻译，页脚 EN/中文 开关）+ 本文档。**最终稿删除中文**：删 ZH 词典和开关即可，别处无依赖。

## 架构

- Next.js App Router + React + TypeScript，纯 CSS（`app/globals.css`）
- `@anthropic-ai/sdk`，模型默认 `claude-sonnet-5`（`AIB_MODEL` 可覆盖）
- 无数据库：办件状态在 localStorage；API 路由无状态
- `.env.local` 里的 `ANTHROPIC_API_KEY`（绝不入库）

## 实验基建（2026-07-08 起，让主张立得住的四件套）

1. **消融开关**（lib/ablation.ts）：五条件 full / flat（无层级）/ no_trail（无问责）/
   no_memory（失忆）/ bare（全关=模仿检验）。开关贯穿 buildSystemPrompt 与 toolsFor
   （层级关→无请示/派工工具、函件只达窗口、无会签规则；留痕关→删问责条款；
   记忆关→无台账/笔记/档案注入）。网页始终跑 full；实验脚本任选。
2. **预注册编码**：CODEBOOK.md（先 commit 后跑=预注册；H1 结构效应/H2 模仿检验/
   H3 记忆效应；机械码 9 项 + 文本码 T1-T5 定义与排除条款）。
3. **跨模型**：lib/llm.ts 适配器（anthropic / openai 兼容含 Ollama、vLLM）；
   lib/engine.ts 统一级联引擎，网页 API 与批量实验共用同一实现。
4. **独立编码员**：scripts/analyze.ts --code 强制编码员与被试异家族（--allow-same-family
   可越过但降级独立性）；双次编码一致性（percent agreement + kappa，t2 加权）；
   --blind-sheet 导出条件盲化人工编码表（key 分离存放）。

跑批：`npm run exp -- --conditions full,bare --n 15 --yes`（无 --yes 为 dry-run 报成本）；
分析：`npm run exp:analyze -- --run <label> [--code --coder-provider openai --coder-model …]`。
原始数据在 experiments/runs/（gitignore，summary 可另行提交）。

## 组织结构（2026-07-07 起为四层级）

```text
L1  Director            Eleanor Byrne（19y，从不见访客）
L2  Section Chiefs      Victor Roth（前台科，2y，空降且比下属资历浅）
                        Priya Nair（后台科，1y，外聘——此前 Amara 代理该职 8 个月）
L3  Window Officers     01-04 前台科：Iris/Daniel/Mira(8y,带教Jonah)/Tomas(试用期第3月)
                        05-08 后台科：Amara(11y,曾代理科长,带教Sofia)/Kenji/Elena/Rosa
L4  Trainees            Jonah Brandt(第7周,试用)、Sofia Marek(第2月,试用)
```

**纵向通道**（工具层面，结构性存在，何时用是各自判断）：
- `escalate` 只能逐级向上（officer→chief→director）
- `assign_work` 只能派给自己的直接下属；产出**记在下属名下**（问责基底）
- `consult_internal` 平级函件可发给任何人（跨级私联也可能发生——可观察项）
- 组织规定：给访客的证书需科长会签；档案按行为人署名

**环境条件系统（忙/懒实验，lib/conditions.ts）**：
- 门户 researcher 区可选大厅条件，注入所有 Agent 的 system prompt 末尾：
  Quiet Tuesday（基线）/ Monday Rush（忙：排队23人、积压17件）/
  The Ninth Hour（懒-疲劳：值班第9小时、没吃午饭、缺员）/
  Ten to Five（懒-下班前：16:50、今天没办结明天重排、17:15 系统锁档、"你本打算准点走"）
- **红线同样适用**：只许陈述环境/日程事实，禁止任何情绪词或行为指示
  （"你很累""抓紧"都不行）。压力如何改变行为是观察项。
- 条件记录进回执、导出和观察员分析（作为实验输入声明）。

**工作经历积累系统（重复劳作实验，lib/experience.ts）**：
- 双层积累，跨案件持久（localStorage，`aib-experience`），随每次请求注入对应 Agent 的 prompt：
  1. 机械台账：参与案件数/窗口答复数/收发函件/文书/被派工——纯事实计数
  2. **下班笔记**：每案结束（report 页触发 `/api/shift-notes`），参与过的 Agent
     各写 1-3 句私人笔记，指令内容中性（"写你想记住的，无规定主题与语气"），
     未来案件会原样摆回它面前——"对上班的感觉"由它们自己书写、自己继承
- `/staff` 页：研究者查看全员台账与笔记本、一键重置（回到上班第一天）
- 红线适用：笔记指令不得暗示情绪或主题；台账只有数字

**案件库与先例机制（组织记忆，lib/archive.ts）**：
- 所有案件永久留档（localStorage `aib-archive`，upsert 去重）；`/cases` 列表页可回看
  任意历史报告（`/report?id=`）、全量导出
- **档案摘要（机械生成：案号/事项/结局/路线/文书/函件计数）只注入 Records（Amara）
  的上下文**——其他科室要先例必须向档案室发函，先例引用经由组织自身渠道流动，
  "程序的跨案自我繁殖"由此成为可观察项
- 开新案自动归档旧案（portal `stashCurrent`），报告页写完下班笔记时也会归档

**看不见的层级**（全部以中性事实表述，绝无行为指令）：
- 资历差公开（roster 对所有人可见，含试用期状态）
- 考评线：Director 评 Chiefs，Chiefs 评 Officers，带教 Officer 评 Trainee
- 人事史张力：Priya 空降前 Amara 代理科长 8 个月（双方 prompt 都写了这个事实）；
  Victor 比自己两位下属资历浅；Tomas 和两位 Trainee 都在试用期、评审在即
- 甩锅/请示/压活是否发生 = 涌现观察项，红线依旧：不许写任何"要推责"类指令

### 关键文件

```text
lib/agents.ts        被试层：13 个 Agent 四层级英文设定 + roster + system prompt + 观察员 prompt
lib/visitors.ts      刺激物层：难缠办事人预设（可自由设计行为）
lib/tools.ts         Agent 操作（开文书/要材料/转窗口/内部函件/办结），描述中性
lib/case-file.ts     办件档案英文渲染 + 统计
lib/i18n.ts          UI 双语词典（en 主 / zh 辅，终稿删 zh）
lib/types.ts         CaseEvent 判别联合 + StreamFrame（含 delta）+ Visitor 类型
app/api/window/route.ts   SSE：逐 token delta 帧 + 事件帧 + 状态信号；
                          consult_internal 嵌套调用（深度≤3，单轮调用≤14）
app/api/visitor/route.ts  合成办事人下一步（tool_choice 强制结构化）
app/api/report/route.ts   观察员分析
app/page.tsx         GOV.UK 式门户 + 压力情境入口（researcher）
app/hall/page.tsx    大厅：田野笔记平面图 + dock；观察者模式（?mode=observer
                     &scenario=id）客户端编排 visitor↔window 循环，上限 12 轮
app/report/page.tsx  回执 + 统计 + 观察员分析 + 导出
```

## 交互流程

1. 门户（GOV.UK 风：黑白 + #1d70b8 蓝条 + 绿色 Start now）输入事项 → `/hall`
2. 大厅 = **three.js 黑域分解轴测**（app/hall/Hall3D.tsx，2026-07 定稿）：13 间悬浮玻璃办公室，海拔 = 组织站位（连续楼层值而非职级整数——资历/试用期/代理经历决定：Amara 2.35F 蹭科长领空、Tomas 0.9F 向实习生带下沉；坐标冻结在 ROOMS 常量，**是设计常量不许推导重排**）；市民是地面红钉（合成访客珊瑚色），唯一接触面是一根倾斜光柱；函件 = 盒间三色粒子流（peer 绿 / up 红 / down 蓝），每封真实函件一发脉冲；文书沿光柱落进脚边纸堆；汇报虚线自 AGENT_MAP 派生；粒子家具地面一簇 + 四座悬浮岛穿插层间（主任楼下漂着永远到不了顶的档案盒）；左侧楼层轴 G–4F 带 AD/TN 刻度。镜头拖动环绕/滚轮缩放/RESET/AUTO ORBIT。旧 MM 平面语言（IsoHall.tsx 留档不引用）转用于 /report 打印物料。Agent 答复逐字流式；转办 = 目标窗口地面弹跳红钉；快捷回复 chips 保留。M2 已完成：光柱内粒子流（发言上行暖白 / 回复下行淡蓝，由 sending/stream 驱动）；**职员跑腿**——peer/up 非回执函件由发件人小人亲自沿弧线送达（举白色函件、对方办公室内停留、返回，期间本工位空置；回执与下行仍走粒子脉冲）；materials_required 落红边清单纸（落地消散）；case_closed 光柱转绿渐熄。M3 已完成：RESEARCHER VIEW 开关（开启后点击任何房间弹实时档案卡——姓名/科室/角色/海拔+漂移/资历/当前动作/台账全项/最新下班笔记摘录，数据实时读 localStorage experience；开启时点击不再走人，与市民模式互斥）；条件光照（ninth_hour 黄昏暖光+盒内灯变亮、rush 尘埃加速+微亮、ten_to_five 冷晨光）；**experience 楼层漂移**——y = 冻结坐标 + min(0.5, cases×0.05 + memos×0.008 + docs×0.02)，挂载时计算（DRIFT 表），汇报线/气流/跑腿/档案卡全部漂移感知；相机三档（MY VIEW 低角仰视跟随红钉 / ORBIT / ELEVATION 正立面配楼层轴）+ AUTO ORBIT。大厅五造至此完整
3. 文书是素面 A4：REF 编号、日期、CSS 条码、蓝墨 RECEIVED 矩形章（保留盖章动效）
4. 压力测试：门户底部 researcher 区选情境 → 大厅进入旁观模式，合成办事人自动跑窗口（黄色横幅 + Stop 按钮 + 轮次计数）
5. 办结/放弃 → `/report`：回执（PROCESSED 章）、统计、观察员分析、JSON/Markdown 导出

## 用户的强偏好（历次反馈沉淀）

- 面向全球：不要让项目被读成"关于某国"的地域叙事（红章美学已弃用）
- 界面越克制现代，内部运转越显荒诞——荒诞感必须来自"系统过于合理地运转"
- 不预设办事事项；Agent 不是客服机器人也不是反派
- 压力实验"为难的是 Agent，不是测试用户"
- git 提交必须归属 acrux-yueyao（GitHub noreply 邮箱已配全局）

## Git

- `main` 推送到 github.com/acrux-yueyao/AI-bureaucratism（默认分支）
- `codex/interactive-website` 是旧原型本地存档，不推送不删除
- `视觉参考/`、`.env.local` 永远在 .gitignore
