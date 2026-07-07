"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { agentLabel, agentRoster, createNetworkEvents, mockCaseId } from "@/lib/preview-data";

const positions: Record<string, { x: number; y: number }> = {
  guidance: { x: 18, y: 20 },
  intake: { x: 32, y: 10 },
  materials: { x: 55, y: 12 },
  eligibility: { x: 76, y: 24 },
  records: { x: 78, y: 55 },
  permission: { x: 62, y: 75 },
  risk: { x: 38, y: 76 },
  coordination: { x: 20, y: 58 },
  supervisor: { x: 39, y: 43 },
  appeal: { x: 64, y: 43 }
};

const tilts: Record<string, number> = {
  guidance: -1.6,
  intake: 0.9,
  materials: -0.7,
  eligibility: 1.2,
  records: -1.1,
  permission: 0.8,
  risk: -0.9,
  coordination: 1.4,
  supervisor: -1.3,
  appeal: 0.7
};

function nodeStyle(id: string): CSSProperties {
  const position = positions[id] ?? { x: 50, y: 50 };
  return {
    left: `${position.x}%`,
    top: `${position.y}%`,
    "--tilt": `${tilts[id] ?? 0}deg`
  } as CSSProperties;
}

function roughPath(fromId: string, toId: string, linkIndex: number) {
  const from = positions[fromId];
  const to = positions[toId];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / length;
  const normalY = dx / length;
  const bend = ((linkIndex % 5) - 2) * 1.35;
  const wobble = linkIndex % 2 === 0 ? 1.2 : -1.1;
  const c1x = from.x + dx * 0.32 + normalX * bend;
  const c1y = from.y + dy * 0.28 + normalY * bend + wobble;
  const c2x = from.x + dx * 0.68 - normalX * (bend * 0.7);
  const c2y = from.y + dy * 0.72 - normalY * (bend * 0.7) - wobble;

  return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`;
}

export function NetworkPlayback({ openRequest }: { openRequest: string }) {
  const events = useMemo(() => createNetworkEvents(openRequest), [openRequest]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const current = events[index];
  const visibleEvents = events.slice(0, index + 1);

  useEffect(() => {
    if (!playing || index >= events.length - 1) return;
    const timer = window.setTimeout(() => {
      setIndex((value) => Math.min(value + 1, events.length - 1));
    }, 1550);
    return () => window.clearTimeout(timer);
  }, [events.length, index, playing]);

  const internalLinks = Array.from(
    new Map(
      events
        .filter((event) => positions[event.from] && positions[event.to])
        .map((event) => [`${event.from}-${event.to}`, event])
    ).values()
  );

  const involvedAgents = new Set(
    visibleEvents.flatMap((event) => [event.from, event.to]).filter((id) => id !== "user")
  ).size;

  const metrics = [
    ["Agent involved", involvedAgents],
    ["Handoffs", visibleEvents.filter((event) => event.type === "HANDOFF").length],
    ["Rules added", visibleEvents.filter((event) => event.type === "RULE_GENERATED").length],
    ["Documents", visibleEvents.filter((event) => event.type === "DOCUMENT_GENERATED").length],
    ["Responsibility shifts", visibleEvents.filter((event) => event.type === "RESPONSIBILITY_SHIFT").length],
    ["User-facing replies", visibleEvents.filter((event) => event.to === "user").length]
  ];

  return (
    <div className="network-console">
      <section className="network-main">
        <div className="network-toolbar">
          <div>
            <strong>Case ID {mockCaseId}</strong>
            <span>{current.statusAfter}</span>
          </div>
          <div className="network-controls">
            <button className="ghost-btn" onClick={() => setPlaying((value) => !value)} type="button">
              {playing ? "暂停观察" : "继续播放"}
            </button>
            <button
              className="ghost-btn"
              onClick={() => setIndex((value) => Math.min(value + 1, events.length - 1))}
              type="button"
            >
              下一条内部指令
            </button>
            <button
              className="ghost-btn"
              onClick={() => {
                setIndex(0);
                setPlaying(true);
              }}
              type="button"
            >
              重新播放
            </button>
          </div>
        </div>

        <div className="network-stage" aria-label="Agent network visualization">
          <svg className="network-lines" viewBox="0 0 100 100" role="img" aria-label="Agent handoff routes">
            {internalLinks.map((event, linkIndex) => {
              const active = event.from === current.from && event.to === current.to;
              return (
                <path
                  className={active ? "active" : ""}
                  d={roughPath(event.from, event.to, linkIndex)}
                  key={`${event.from}-${event.to}`}
                />
              );
            })}
          </svg>
          <div className="sketch-callout callout-left">jurisdiction route?</div>
          <div className="sketch-callout callout-right">who is allowed to decide</div>

          {agentRoster.map((agent) => {
            const isSender = current.from === agent.id;
            const isReceiver = current.to === agent.id;
            const hasParticipated = visibleEvents.some((event) => event.from === agent.id || event.to === agent.id);
            return (
              <article
                className={[
                  "agent-node",
                  isSender ? "sender" : "",
                  isReceiver ? "receiver" : "",
                  hasParticipated ? "visited" : ""
                ].join(" ")}
                key={agent.id}
                style={nodeStyle(agent.id)}
              >
                <span>Layer {agent.layer}</span>
                <strong>{agent.displayName}</strong>
                <small>{agent.department}</small>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="network-side">
        <div className="status-card">
          <span>Current Status</span>
          <strong>{current.statusAfter}</strong>
          <p>{current.marker}</p>
        </div>
        <div className="metric-grid">
          {metrics.map(([label, value]) => (
            <div className="metric compact" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="notice-card">
          <h3>当前内部指令</h3>
          <p>
            {agentLabel(current.from)} → {agentLabel(current.to)}
          </p>
          <p>{current.subject}</p>
        </div>
      </aside>

      <section className="communications-panel">
        <div className="panel-heading">
          <h2>Internal Communications Feed</h2>
          <span>{visibleEvents.length} / {events.length}</span>
        </div>
        <div className="feed-table">
          {visibleEvents.slice().reverse().map((event) => (
            <article className="feed-row" key={event.id}>
              <div className="feed-meta">
                <span>{event.time}</span>
                <strong>{event.marker}</strong>
              </div>
              <div>
                <p className="feed-route">
                  {agentLabel(event.from)} → {agentLabel(event.to)}
                </p>
                <h3>{event.subject}</h3>
                <p>{event.message}</p>
                {event.artifact ? <span className="artifact-chip">{event.artifact}</span> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
