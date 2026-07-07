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

### 关键文件

```text
lib/agents.ts        被试层：8 个 Agent 英文设定 + system prompt + 观察员 prompt
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
2. 大厅平面图（田野笔记层保留：纸白底、手绘小人、红铅笔圈、绿函件网、石墨足迹、手写标注 Caveat/文楷）；**Agent 答复逐字流式**；转办提示带 "Walk to Window N →" 一键前往并自动报到；输入框上方快捷回复 chips
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
