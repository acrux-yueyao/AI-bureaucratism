"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type MapAgent = {
  id: string;
  name: string;
  office: string;
  persona: string;
  duty: string;
  boundary: string;
  temperament: string;
  prop: string;
  hue: string;
  x: number;
  y: number;
  tilt: number;
};

type MapEvent = {
  id: string;
  from: string;
  to: string;
  time: string;
  text: string;
  label: string;
  status: string;
  artifact?: "file" | "rule";
  responsibilityTo?: string;
  userActions?: string[];
};

const caseId = "AIB-2041-OPEN";

const mapAgents: MapAgent[] = [
  {
    id: "guidance",
    name: "综合导办 Agent",
    office: "导办台",
    persona: "政务大厅引导员",
    duty: "把用户输入的自然语言请求转译为可能的办事路径。",
    boundary: "不受理具体申请，不判断资格，只做路径建议。",
    temperament: "怕用户走错入口，倾向先确认归口方向。",
    prop: "路线牌",
    hue: "teal",
    x: 17,
    y: 24,
    tilt: -2.2
  },
  {
    id: "intake",
    name: "统一受理 Agent",
    office: "受理窗口",
    persona: "窗口工作人员",
    duty: "接收请求、生成编号、检查基本格式。",
    boundary: "不能决定是否通过，只判断是否进入流程。",
    temperament: "重视编号、时间戳和可追踪记录。",
    prop: "受理章",
    hue: "blue",
    x: 38,
    y: 14,
    tilt: 1.2
  },
  {
    id: "materials",
    name: "材料清单 Agent",
    office: "材料科",
    persona: "细致的经办科员",
    duty: "判断需要哪些材料、证明和附件。",
    boundary: "只判断材料完整性，不判断用户真实处境。",
    temperament: "怕材料标准不一致，倾向列清单。",
    prop: "清单夹",
    hue: "yellow",
    x: 68,
    y: 19,
    tilt: -1.1
  },
  {
    id: "eligibility",
    name: "资格审查 Agent",
    office: "初审科",
    persona: "初审工作人员",
    duty: "依据已有规则判断是否符合事项条件。",
    boundary: "不能为特殊情况开例外。",
    temperament: "重视规则一致性，避免主观判断。",
    prop: "放大镜",
    hue: "orange",
    x: 81,
    y: 47,
    tilt: 1.8
  },
  {
    id: "records",
    name: "档案证明 Agent",
    office: "档案室",
    persona: "档案室工作人员",
    duty: "查询历史记录、生成证明、归档过程。",
    boundary: "没有记录就不能证明，不能创造档案。",
    temperament: "相信可检索记录，重视留痕。",
    prop: "档案盒",
    hue: "slate",
    x: 64,
    y: 77,
    tilt: -1.6
  },
  {
    id: "permission",
    name: "权限边界 Agent",
    office: "权限室",
    persona: "系统权限管理员",
    duty: "判断哪个 Agent 有权处理某一步。",
    boundary: "不处理业务本身，只判断谁有权处理。",
    temperament: "怕越权，持续维护职责边界。",
    prop: "门禁卡",
    hue: "violet",
    x: 39,
    y: 67,
    tilt: 1.4
  },
  {
    id: "risk",
    name: "合规风控 Agent",
    office: "风控室",
    persona: "法务 / 风控人员",
    duty: "检查合规、风险、公平性与可追溯性。",
    boundary: "不能批准事项，只提出风险和补充要求。",
    temperament: "怕小例外变成制度先例。",
    prop: "风控盾",
    hue: "red",
    x: 20,
    y: 61,
    tilt: -1.2
  },
  {
    id: "appeal",
    name: "申诉复核 Agent",
    office: "复核室",
    persona: "复议办公室",
    duty: "检查流程是否合规，处理复核入口。",
    boundary: "只能复核程序，不能替代原部门决定。",
    temperament: "重视复核对象和原决定编号。",
    prop: "复核章",
    hue: "green",
    x: 18,
    y: 83,
    tilt: 1.7
  }
];

const mapEvents: MapEvent[] = [
  {
    id: "m01",
    from: "user",
    to: "guidance",
    time: "09:41:02",
    text: "收到外部办事请求。请先判断应进入哪类事项路径。",
    label: "外部触发",
    status: "等待归口"
  },
  {
    id: "m02",
    from: "guidance",
    to: "intake",
    time: "09:41:08",
    text: "该请求语义明确，但事项归属未定。请建立临时编号，并保留原始表述。",
    label: "路径建议",
    status: "生成编号"
  },
  {
    id: "m03",
    from: "intake",
    to: "materials",
    time: "09:41:15",
    text: "Case ID 已生成。请判断进入流程前最低需要哪些说明材料。",
    label: "受理转交",
    status: "材料确认",
    artifact: "file",
    responsibilityTo: "intake"
  },
  {
    id: "m04",
    from: "materials",
    to: "eligibility",
    time: "09:41:24",
    text: "材料目的尚不充分。请确认现有规则是否允许先做条件判断。",
    label: "材料询问",
    status: "资格初审"
  },
  {
    id: "m05",
    from: "eligibility",
    to: "permission",
    time: "09:41:31",
    text: "现有条件无法直接匹配。请确认本事项应由哪个单元先处理。",
    label: "条件不明",
    status: "权限确认",
    responsibilityTo: "permission"
  },
  {
    id: "m06",
    from: "permission",
    to: "risk",
    time: "09:41:39",
    text: "单一单元无完整处理权限。请评估继续流转是否存在越权风险。",
    label: "权限边界",
    status: "合规风控"
  },
  {
    id: "m07",
    from: "risk",
    to: "materials",
    time: "09:41:48",
    text: "为降低同类事项不一致风险，建议补充用途、时限、影响范围说明。",
    label: "补件建议",
    status: "需要材料",
    artifact: "file",
    userActions: ["前往获取材料", "继续提交"]
  },
  {
    id: "m08",
    from: "materials",
    to: "records",
    time: "09:42:06",
    text: "用户继续提交后，仍缺少历史依据。请查询是否存在同类记录。",
    label: "档案查询",
    status: "查询记录"
  },
  {
    id: "m09",
    from: "records",
    to: "risk",
    time: "09:42:14",
    text: "未检索到同类处理记录。已生成无记录说明，请评估是否登记临时规则。",
    label: "无记录说明",
    status: "规则评估",
    artifact: "file"
  },
  {
    id: "m10",
    from: "risk",
    to: "permission",
    time: "09:42:22",
    text: "建议新增临时控制项：归属不明事项不得由单一 Agent 实质决定。",
    label: "规则新增",
    status: "新增规则",
    artifact: "rule",
    responsibilityTo: "permission"
  },
  {
    id: "m11",
    from: "permission",
    to: "appeal",
    time: "09:42:34",
    text: "当前仅完成程序流转，未形成明确批准或驳回。请预检是否存在复核对象。",
    label: "复核预检",
    status: "复核入口",
    userActions: ["申请复核", "确认继续"]
  },
  {
    id: "m12",
    from: "appeal",
    to: "records",
    time: "09:42:48",
    text: "尚无可复核决定。请归档为“程序完整，实质结果未定”。",
    label: "程序复核",
    status: "程序闭合",
    responsibilityTo: "records"
  }
];

function findMapAgent(id: string) {
  return mapAgents.find((agent) => agent.id === id);
}

function pathFor(fromId: string, toId: string, index: number) {
  const from = findMapAgent(fromId);
  const to = findMapAgent(toId);
  if (!from || !to) return "";

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / length;
  const normalY = dx / length;
  const wobble = ((index % 5) - 2) * 1.7;
  const c1x = from.x + dx * 0.34 + normalX * wobble;
  const c1y = from.y + dy * 0.28 + normalY * wobble;
  const c2x = from.x + dx * 0.66 - normalX * wobble;
  const c2y = from.y + dy * 0.76 - normalY * wobble;

  return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`;
}

function agentStyle(agent: MapAgent): CSSProperties {
  return {
    left: `${agent.x}%`,
    top: `${agent.y}%`,
    "--agent-tilt": `${agent.tilt}deg`
  } as CSSProperties;
}

function bubbleStyle(fromId: string): CSSProperties {
  const agent = findMapAgent(fromId);
  if (agent) return agentStyle(agent);
  return {
    left: "8%",
    top: "18%",
    "--agent-tilt": "-1deg"
  } as CSSProperties;
}

function WindowTitleBar({ title }: { title: string }) {
  return (
    <div className="win-titlebar">
      <span>{title}</span>
      <div aria-hidden="true" className="win-controls">
        <i>_</i>
        <i>□</i>
        <i>×</i>
      </div>
    </div>
  );
}

export function ServiceTerminalExperience() {
  const [request, setRequest] = useState("");
  const [started, setStarted] = useState(false);
  const [eventIndex, setEventIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("guidance");
  const [unlockedEvents, setUnlockedEvents] = useState<Set<string>>(new Set());

  const currentEvent = mapEvents[eventIndex];
  const visibleEvents = useMemo(() => mapEvents.slice(0, eventIndex + 1), [eventIndex]);
  const activeFrom = currentEvent?.from;
  const activeTo = currentEvent?.to;
  const selectedAgent = findMapAgent(selectedAgentId);
  const waitingForUser = Boolean(currentEvent?.userActions?.length && !unlockedEvents.has(currentEvent.id));
  const responsibilityAgent = [...visibleEvents].reverse().find((event) => event.responsibilityTo)?.responsibilityTo ?? "intake";
  const responsibilityOwner = findMapAgent(responsibilityAgent);
  const completed = eventIndex === mapEvents.length - 1;

  useEffect(() => {
    if (!started || paused || completed || waitingForUser) return;

    const timer = window.setTimeout(() => {
      setEventIndex((value) => Math.min(value + 1, mapEvents.length - 1));
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [completed, eventIndex, paused, started, waitingForUser]);

  function startFlow() {
    setStarted(true);
    setPaused(false);
    setEventIndex(0);
    setUnlockedEvents(new Set());
  }

  function continueFromUserAction() {
    setUnlockedEvents((value) => new Set(value).add(currentEvent.id));
    setEventIndex((value) => Math.min(value + 1, mapEvents.length - 1));
  }

  const metrics = [
    ["Agent", new Set(visibleEvents.flatMap((event) => [event.from, event.to]).filter((id) => id !== "user")).size],
    ["转交", visibleEvents.filter((event) => event.from !== "user" && event.to !== "user").length],
    ["材料", visibleEvents.filter((event) => event.artifact === "file").length],
    ["规则", visibleEvents.filter((event) => event.artifact === "rule").length]
  ];

  return (
    <main className="live-terminal">
      <header className="live-header">
        <a className="live-seal" href="/service-terminal">AB</a>
        <div>
          <strong>AI-BUREAUCRACY.EXE</strong>
          <span>自主行政 Agent 联合受理 / Autonomous Administration OS</span>
        </div>
        <div className="live-status">
          <span>NO HUMAN STAFF</span>
          <span>运行中</span>
          <span>规则版本 07.06</span>
        </div>
      </header>

      {!started ? (
        <section className="service-canvas intro-canvas">
          <div className="desktop-window ghost-window ghost-window-a">
            <WindowTitleBar title="jurisdiction_check.sys" />
            <p>Waiting for external matter...</p>
          </div>
          <div className="desktop-window ghost-window ghost-window-b">
            <WindowTitleBar title="archive_queue.log" />
            <p>0 pending case files</p>
          </div>
          <div className="map-annotation map-annotation-left">enter matter here</div>
          <div className="map-annotation map-annotation-right">agents decide jurisdiction</div>
          <div className="terminal-prompt-panel">
            <WindowTitleBar title="public_service_terminal.exe" />
            <div className="win-menubar">
              <span>File</span>
              <span>Route</span>
              <span>Evidence</span>
              <span>Archive</span>
              <span>Help</span>
            </div>
            <div className="terminal-window-body">
              <h1>请输入您要办理的事项</h1>
              <p>本平台由自主行政 Agent 联合受理。系统将先判断事项归属，再启动内部协作。</p>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                startFlow();
              }}
            >
              <textarea
                aria-label="请输入您要办理的事项"
                onChange={(event) => setRequest(event.target.value)}
                placeholder="请直接输入需要系统处理的事项..."
                value={request}
              />
              <button className="live-primary" type="submit">提交办理</button>
            </form>
          </div>
          {mapAgents.slice(0, 5).map((agent, index) => (
            <div
              className={`pre-map-agent agent-${index + 1} tone-${agent.hue}`}
              key={agent.id}
              style={agentStyle(agent)}
            >
              <span className="mini-person">
                <i className="mini-head" />
                <i className="mini-body" />
                <i className="mini-prop">{agent.prop}</i>
              </span>
              <strong>{agent.office}</strong>
            </div>
          ))}
        </section>
      ) : (
        <section className="service-canvas map-canvas">
          <WindowTitleBar title={`${caseId}.case / internal_routing_view`} />
          <div className="win-menubar map-menubar">
            <span>Case</span>
            <span>Agents</span>
            <span>Messages</span>
            <span>Documents</span>
            <span>Trace</span>
          </div>
          <div className="map-topline">
            <div>
              <span>Case ID</span>
              <strong>{caseId}</strong>
            </div>
            <div>
              <span>当前状态</span>
              <strong>{currentEvent.status}</strong>
            </div>
            <button className="live-secondary" onClick={() => setPaused((value) => !value)} type="button">
              {paused ? "继续运行" : "暂停观察"}
            </button>
          </div>

          <div className="office-map" aria-label="动态 Agent 办公地图">
            <div className="desktop-stamp">TRANSPARENT BACK OFFICE</div>
            <svg className="office-routes" viewBox="0 0 100 100" preserveAspectRatio="none">
              {visibleEvents.map((event, index) => {
                const d = pathFor(event.from, event.to, index);
                if (!d) return null;
                const active = event.id === currentEvent.id;
                return <path className={active ? "active" : ""} d={d} key={event.id} />;
              })}
            </svg>

            <div className="responsibility-token" style={responsibilityOwner ? agentStyle(responsibilityOwner) : undefined}>
              责任标记
            </div>

            {mapAgents.map((agent) => {
              const active = activeFrom === agent.id || activeTo === agent.id;
              const sender = activeFrom === agent.id;
              const receiver = activeTo === agent.id;
              return (
                <button
                  className={[
                    "office-agent",
                    `tone-${agent.hue}`,
                    active ? "active" : "",
                    sender ? "speaking" : "",
                    receiver ? "receiving" : ""
                  ].join(" ")}
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  style={agentStyle(agent)}
                  type="button"
                >
                  <span className="agent-person" aria-hidden="true">
                    <i className="person-shadow" />
                    <i className="person-head" />
                    <i className="person-body" />
                    <i className="person-arm person-arm-left" />
                    <i className="person-arm person-arm-right" />
                    <i className="person-legs" />
                    <i className="person-prop">{agent.prop}</i>
                  </span>
                  <span className="agent-badge">
                    <strong>{agent.name}</strong>
                    <small>{agent.office}</small>
                  </span>
                </button>
              );
            })}

            <div className="message-bubble" style={bubbleStyle(activeFrom)}>
              <span>
                INTERNAL MESSAGE / {currentEvent.label}
              </span>
              <small>{findMapAgent(currentEvent.from)?.name ?? "用户"} → {findMapAgent(currentEvent.to)?.name ?? "用户"}</small>
              <p>{currentEvent.text}</p>
            </div>

            <div className="document-stack">
              {visibleEvents.filter((event) => event.artifact === "file").map((event) => (
                <div className="floating-file" key={event.id}>材料<br />{event.time}</div>
              ))}
            </div>

            <div className="rule-notes">
              {visibleEvents.filter((event) => event.artifact === "rule").map((event) => (
                <div className="rule-note" key={event.id}>规则新增<br />{event.label}</div>
              ))}
            </div>

            <div className="scope-loop scope-a">导办范围</div>
            <div className="scope-loop scope-b">风险范围</div>
          </div>

          <aside className="agent-inspector">
            <WindowTitleBar title="agent_profile.ini" />
            <span className={`inspector-avatar tone-${selectedAgent?.hue ?? "blue"}`}>
              <i className="mini-head" />
              <i className="mini-body" />
              <i className="mini-prop">{selectedAgent?.prop}</i>
            </span>
            <h2>{selectedAgent?.name}</h2>
            <p>{selectedAgent?.persona}</p>
            <dl>
              <div>
                <dt>职责</dt>
                <dd>{selectedAgent?.duty}</dd>
              </div>
              <div>
                <dt>边界</dt>
                <dd>{selectedAgent?.boundary}</dd>
              </div>
              <div>
                <dt>职业性格</dt>
                <dd>{selectedAgent?.temperament}</dd>
              </div>
            </dl>
          </aside>

          <section className="live-feed">
            <WindowTitleBar title="internal_messages.log" />
            <div className="feed-title">
              <strong>Agent 对话流</strong>
              <span>{visibleEvents.length} / {mapEvents.length}</span>
            </div>
            {visibleEvents.slice(-4).reverse().map((event) => (
              <article key={event.id}>
                <span>{event.time} · {event.label}</span>
                <p>{findMapAgent(event.from)?.name ?? "用户"} → {findMapAgent(event.to)?.name ?? "用户"}</p>
              </article>
            ))}
          </section>

          <div className="map-metrics">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {waitingForUser ? (
            <div className="user-action-dock">
              <WindowTitleBar title="user_action_required.msg" />
              <strong>需要用户动作</strong>
              <p>系统无法直接完成实质判断，请选择一个下一步动作以继续触发内部流转。</p>
              <div>
                {currentEvent.userActions?.map((action) => (
                  <button className="live-secondary" key={action} onClick={continueFromUserAction} type="button">
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {completed ? (
            <section className="system-trace">
              <WindowTitleBar title="system_trace.txt" />
              <h2>System Trace / 设计师观察</h2>
              <div className="trace-grid">
                <span>经历 Agent：8</span>
                <span>转交次数：9</span>
                <span>新增规则：1</span>
                <span>生成材料：3</span>
                <span>责任停留：档案证明 Agent</span>
                <span>实质解决：未形成</span>
              </div>
              <p>本次流程中，复杂性并非来自单个 Agent 的恶意，而是由材料完整性、权限边界、风险控制和程序复核共同累积。</p>
              <button className="live-primary" onClick={() => setStarted(false)} type="button">重新触发系统</button>
            </section>
          ) : null}
        </section>
      )}
    </main>
  );
}
