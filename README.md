# AI Bureaucracy

一个 Speculative Design / Design Research 单页网页原型，用于观察一个完全由 AI Agent 自主运行的行政组织，是否会在层级、权限、合规、风控、归档和部门协作条件下自然生成官僚化行为。

## Project Question

Is bureaucracy a uniquely human culture, or an inevitable outcome of sufficiently complex organizations?

## Prototype

这是一个静态前端原型，无需后端即可运行。页面包含：

- 政务服务平台式首页与办事入口
- 10 个具有明确职责边界的 AI Agent
- 简单事项申请流程
- Agent 对话 / 审批记录
- 责任转移地图
- 新增规则记录与材料清单
- 行政文件输出
- Designer / Research Feedback 面板
- AI 机构年度报告区域

## Run locally

直接打开 `index.html`，或在项目目录启动任意静态服务：

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://127.0.0.1:4173/
```

## Notes

本项目不是现实政府系统，也不是对 AI 的反派化叙事。它把不同 Agent 的组织身份、职责边界和工作目标作为设计条件，让申请流程在这些条件下展开，以便观察官僚主义行为是否会从组织结构中浮现。
