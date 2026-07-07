# AI Bureaucracy

一个 Speculative Design / Design Research 单页网页原型，用于观察一个完全由 AI Agent 自主运行的行政组织，是否会在层级、权限、合规、风控、归档和部门协作条件下自然生成官僚化行为。

## Project Question

Is bureaucracy a uniquely human culture, or an inevitable outcome of sufficiently complex organizations?

## Current Stage

当前版本是 **Next.js 静态视觉预览**，只用于确认 Agent 人设、页面流程和视觉方向。它暂时不接 OpenAI、Supabase 或任何后端 API。

预览内容包含：

- 公共服务终端首页
- Intake Form 页面
- Live Case Processing 页面
- Document / Material Request 页面
- Participant Feedback 页面
- Research Summary 页面
- 9 个具有明确职责边界的 AI Agent 人设
- 每个页面对应的 Agent、系统动作、用户动作和 bureaucratic logic

## Run locally

安装依赖后启动预览：

```bash
npm install
npm run dev
```

然后访问：

```text
http://127.0.0.1:3000/service-terminal
```

如果本机文件监听数量不足，也可以先构建再用生产预览：

```bash
npm run build
npm run start
```

## Notes

本项目不是现实政府系统，也不是对 AI 的反派化叙事。它把不同 Agent 的组织身份、职责边界和工作目标作为设计条件，让申请流程在这些条件下展开，以便观察官僚主义行为是否会从组织结构中浮现。
