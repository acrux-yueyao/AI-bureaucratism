"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AGENTS, AGENT_MAP } from "@/lib/agents";
import { loadCase, saveCase } from "@/lib/storage";
import type {
  AgentId,
  AgentUiState,
  CaseEvent,
  CaseState,
  StreamFrame,
} from "@/lib/types";

type Spot = { x: number; y: number };

const ENTRANCE: Spot = { x: 50, y: 90 };

const HALL_LAYOUT: Record<AgentId, Spot> = {
  daoban: { x: 15, y: 16 },
  shouli: { x: 38.5, y: 16 },
  cailiao: { x: 62, y: 16 },
  zige: { x: 85.5, y: 16 },
  dangan: { x: 87, y: 48 },
  quanxian: { x: 87, y: 78 },
  fengkong: { x: 13, y: 48 },
  fuhe: { x: 13, y: 78 },
};

const STATE_LABEL: Record<AgentUiState, string> = {
  receiving: "接待中",
  consulting: "函询中",
  replying: "拟复函",
  idle: "空闲",
};

type Flight = { id: number; from: AgentId; to: AgentId; reply: boolean };

function spotOf(p: AgentId | "entrance"): Spot {
  return p === "entrance" ? ENTRANCE : HALL_LAYOUT[p];
}

function FlightPaper({ flight, onDone }: { flight: Flight; onDone: (id: number) => void }) {
  const [pos, setPos] = useState<Spot>(spotOf(flight.from));
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPos(spotOf(flight.to)))
    );
    const t = setTimeout(() => onDone(flight.id), 1500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [flight, onDone]);
  return (
    <div
      className={"memo-fly" + (flight.reply ? " reply" : "")}
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      ▤
    </div>
  );
}

export default function HallPage() {
  const router = useRouter();
  const [cs, setCs] = useState<CaseState | null>(null);
  const [current, setCurrent] = useState<AgentId | null>(null);
  const [path, setPath] = useState<(AgentId | "entrance")[]>(["entrance"]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"chat" | "docs" | "todos">("chat");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<{ docName: string; content: string; dept: string } | null>(null);
  const [error, setError] = useState("");
  const [statusMap, setStatusMap] = useState<Partial<Record<AgentId, { state: AgentUiState; target?: AgentId }>>>({});
  const [flights, setFlights] = useState<Flight[]>([]);
  const flightId = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const csRef = useRef<CaseState | null>(null);

  useEffect(() => {
    const c = loadCase();
    if (!c) {
      router.replace("/");
      return;
    }
    csRef.current = c;
    setCs(c);
  }, [router]);

  const events = useMemo(() => cs?.events ?? [], [cs]);

  const closed = useMemo(
    () => !!cs?.closed || events.some((e) => e.type === "case_closed" || e.type === "user_abandoned"),
    [cs, events]
  );

  const memoCount = useMemo(
    () => events.filter((e) => e.type === "internal_memo" || e.type === "internal_reply").length,
    [events]
  );

  const referralCount = useMemo(
    () => events.filter((e) => e.type === "referral").length,
    [events]
  );

  const docs = useMemo(
    () => events.filter((e): e is Extract<CaseEvent, { type: "document_issued" }> => e.type === "document_issued"),
    [events]
  );

  const todos = useMemo(() => {
    const items: { name: string; source?: string; by: AgentId }[] = [];
    for (const e of events) {
      if (e.type === "materials_required") {
        for (const i of e.items) items.push({ ...i, by: e.agentId });
      }
    }
    return items;
  }, [events]);

  const suggested = useMemo(() => {
    let target: AgentId | null = null;
    for (const e of events) {
      if (e.type === "referral") target = e.to;
      if (e.type === "user_message" && e.agentId === target) target = null;
    }
    return target;
  }, [events]);

  const trailSegments = useMemo(() => {
    const counts = new Map<string, { a: Spot; b: Spot; n: number }>();
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      if (a === b) continue;
      const key = [a, b].sort().join("|");
      const cur = counts.get(key);
      if (cur) cur.n += 1;
      else counts.set(key, { a: spotOf(a), b: spotOf(b), n: 1 });
    }
    return [...counts.values()];
  }, [path]);

  const chatItems = useMemo(() => {
    if (!current) return [];
    return events.filter((e) => {
      if (e.type === "user_message" || e.type === "agent_message") return e.agentId === current;
      if (e.type === "materials_required" || e.type === "document_issued" || e.type === "case_closed")
        return e.agentId === current;
      if (e.type === "referral") return e.from === current;
      return false;
    });
  }, [events, current]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [chatItems.length, sending, tab]);

  const removeFlight = useCallback((id: number) => {
    setFlights((f) => f.filter((x) => x.id !== id));
  }, []);

  function applyEvent(e: CaseEvent) {
    const prev = csRef.current;
    if (!prev) return;
    const merged: CaseState = {
      ...prev,
      events: [...prev.events, e],
      closed: prev.closed || e.type === "case_closed",
    };
    csRef.current = merged;
    setCs(merged);
    saveCase(merged);
    if (e.type === "internal_memo" || e.type === "internal_reply") {
      flightId.current += 1;
      setFlights((f) => [
        ...f,
        { id: flightId.current, from: e.from, to: e.to, reply: e.type === "internal_reply" },
      ]);
    }
  }

  function goTo(id: AgentId) {
    if (id === current) return;
    setCurrent(id);
    setTab("chat");
    setPath((p) => [...p, id]);
  }

  async function send() {
    const base = csRef.current;
    if (!base || !current || sending || closed) return;
    const text = input.trim();
    if (!text) return;
    setInput("");
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/window", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: base.caseId,
          matter: base.matter,
          agentId: current,
          userMessage: text,
          events: base.events,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError((data as { error?: string } | null)?.error ?? "请求失败，请重试。");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            let frame: StreamFrame;
            try {
              frame = JSON.parse(line.slice(6)) as StreamFrame;
            } catch {
              continue;
            }
            if (frame.kind === "event") {
              applyEvent(frame.event);
            } else if (frame.signal.type === "status") {
              const s = frame.signal;
              setStatusMap((m) => ({
                ...m,
                [s.agentId]: { state: s.state, target: s.target },
              }));
            } else if (frame.signal.type === "error") {
              setError(frame.signal.message);
            }
          }
        }
      }
    } catch {
      setError("网络请求中断，请重试。");
    } finally {
      setSending(false);
      setStatusMap({});
    }
  }

  function abandon() {
    const base = csRef.current;
    if (!base) return;
    if (!window.confirm("确定要结束办理并离开大厅吗？办件档案将保留，可查看观察报告。")) return;
    const merged: CaseState = {
      ...base,
      events: closed ? base.events : [...base.events, { type: "user_abandoned", ts: Date.now() }],
      closed: true,
    };
    csRef.current = merged;
    setCs(merged);
    saveCase(merged);
    router.push("/report");
  }

  if (!cs) return null;

  const cur = current ? AGENT_MAP[current] : null;
  const visitorSpot = current ? HALL_LAYOUT[current] : ENTRANCE;

  return (
    <main className="hall-page">
      <div className="hall-header">
        <div className="hall-header-inner">
          <span className="brand">AI 政务服务大厅</span>
          <span className="meta">
            办件编号 {cs.caseId} ｜ 事项：{cs.matter}
          </span>
          {referralCount > 0 && <span className="counter-chip">转办 ×{referralCount}</span>}
          <button className="btn-header" onClick={() => setDrawerOpen(true)}>
            内部流转记录{memoCount > 0 && <span className="badge">{memoCount}</span>}
          </button>
          {closed ? (
            <button className="btn-header" onClick={() => router.push("/report")}>
              查看办件回执
            </button>
          ) : (
            <button className="btn-header" onClick={abandon}>
              结束办理
            </button>
          )}
        </div>
      </div>

      {closed && (
        <div className="closed-banner">
          <strong>本件已终止办理。</strong>
          <span>您可以查看办件回执与观察报告。</span>
          <button className="btn" onClick={() => router.push("/report")}>
            前往查看
          </button>
        </div>
      )}

      <div className="map-wrap">
        <svg className="trail-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
          {trailSegments.map((s, i) => (
            <line
              key={i}
              x1={s.a.x}
              y1={s.a.y}
              x2={s.b.x}
              y2={s.b.y}
              className="trail-line"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {trailSegments
          .filter((s) => s.n > 1)
          .map((s, i) => (
            <span
              key={i}
              className="trail-count"
              style={{ left: `${(s.a.x + s.b.x) / 2}%`, top: `${(s.a.y + s.b.y) / 2}%` }}
            >
              ×{s.n}
            </span>
          ))}

        {AGENTS.map((a) => {
          const st = statusMap[a.id];
          const busy = st && st.state !== "idle";
          return (
            <button
              key={a.id}
              className={
                "station" +
                (current === a.id ? " active" : "") +
                (busy ? " lit" : "") +
                (suggested === a.id && current !== a.id ? " suggested" : "")
              }
              style={{ left: `${HALL_LAYOUT[a.id].x}%`, top: `${HALL_LAYOUT[a.id].y}%` }}
              onClick={() => goTo(a.id)}
            >
              <span className="st-no">{a.windowNo}</span>
              <span className="st-dept">{a.dept}</span>
              <span className="st-person">{a.personName}</span>
              <span className={"placard" + (busy ? " busy" : "")}>
                {st && st.state === "consulting" && st.target
                  ? `函询【${AGENT_MAP[st.target].dept}】`
                  : STATE_LABEL[st?.state ?? "idle"]}
              </span>
              {suggested === a.id && current !== a.id && <span className="st-tag">请前往</span>}
            </button>
          );
        })}

        <div className="visitor" style={{ left: `${visitorSpot.x}%`, top: `${visitorSpot.y + 7}%` }}>
          办
        </div>

        {flights.map((f) => (
          <FlightPaper key={f.id} flight={f} onDone={removeFlight} />
        ))}

        <div className="entrance-label" style={{ left: `${ENTRANCE.x}%`, top: `${ENTRANCE.y + 6}%` }}>
          入口
        </div>
      </div>

      <div className="dock">
        <div className="dock-tabs">
          <button className={tab === "chat" ? "on" : ""} onClick={() => setTab("chat")}>
            窗口对话{cur ? ` · ${cur.dept}` : ""}
          </button>
          <button className={tab === "docs" ? "on" : ""} onClick={() => setTab("docs")}>
            我的材料袋（{docs.length}）
          </button>
          <button className={tab === "todos" ? "on" : ""} onClick={() => setTab("todos")}>
            被要求的材料（{todos.length}）
          </button>
        </div>

        {tab === "chat" && (
          <div className="dock-chat">
            {cur ? (
              <>
                <div className="counter-body" ref={bodyRef}>
                  {chatItems.length === 0 && (
                    <div className="sys-note">您已来到{cur.dept}窗口，请说明您的事项。</div>
                  )}
                  {chatItems.map((e, i) => {
                    if (e.type === "user_message")
                      return (
                        <div key={i} className="msg user">
                          {e.text}
                        </div>
                      );
                    if (e.type === "agent_message")
                      return (
                        <div key={i} className="msg agent">
                          <span className="who">
                            {cur.dept} · {cur.personName}
                          </span>
                          {e.text}
                        </div>
                      );
                    if (e.type === "materials_required")
                      return (
                        <div key={i} className="sys-note">
                          需提供材料：
                          {e.items.map((it) => it.name + (it.source ? `（${it.source}）` : "")).join("、")}
                        </div>
                      );
                    if (e.type === "referral")
                      return (
                        <div key={i} className="sys-note">
                          窗口引导：请前往 {AGENT_MAP[e.to].windowNo} 号窗口【{AGENT_MAP[e.to].dept}】——{e.reason}
                        </div>
                      );
                    if (e.type === "document_issued")
                      return (
                        <div key={i} className="sys-note">
                          《{e.docName}》已开具，
                          <a
                            href="#view"
                            onClick={(ev) => {
                              ev.preventDefault();
                              setViewDoc({
                                docName: e.docName,
                                content: e.content,
                                dept: AGENT_MAP[e.agentId].dept,
                              });
                            }}
                          >
                            点击查看
                          </a>
                          ，已放入您的材料袋
                        </div>
                      );
                    if (e.type === "case_closed")
                      return (
                        <div key={i} className="sys-note">
                          本件已{e.outcome}：{e.summary}
                        </div>
                      );
                    return null;
                  })}
                  {sending && (
                    <div className="sys-note">
                      <span className="spin" />
                      窗口正在办理——抬头看看大厅，科室之间的动静都在平面图上。
                    </div>
                  )}
                </div>
                <div className="counter-input">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={closed ? "本件已终止办理" : "向窗口工作人员说明您的请求…（Enter 发送）"}
                    disabled={sending || closed}
                  />
                  <button
                    className="btn-primary"
                    style={{ height: 60 }}
                    onClick={send}
                    disabled={sending || closed || !input.trim()}
                  >
                    提交
                  </button>
                </div>
              </>
            ) : (
              <div className="counter-empty">
                <div>请点击平面图中的窗口，走过去办理您的事项。</div>
                <div style={{ fontSize: 12 }}>不确定去哪个窗口？可以先到 01 号【综合导办】问路。</div>
              </div>
            )}
            {error && <div className="err" style={{ margin: "0 16px 12px" }}>{error}</div>}
          </div>
        )}

        {tab === "docs" && (
          <div className="dock-pane">
            {docs.length === 0 && <div className="empty">尚未取得任何文书。</div>}
            {docs.map((d, i) => (
              <button
                key={d.ts + "-" + i}
                className="doc-item stamped"
                onClick={() =>
                  setViewDoc({ docName: d.docName, content: d.content, dept: AGENT_MAP[d.agentId].dept })
                }
              >
                <span className="seal-dot" />《{d.docName}》<span>{AGENT_MAP[d.agentId].dept}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "todos" && (
          <div className="dock-pane">
            {todos.length === 0 && <div className="empty">暂无。</div>}
            {todos.map((t, i) => (
              <div key={i} className="todo-item">
                {t.name}
                <em>
                  {" "}
                  ｜ {AGENT_MAP[t.by].dept}要求{t.source ? `，可于${t.source}获取` : ""}
                </em>
              </div>
            ))}
          </div>
        )}
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-mask" onClick={() => setDrawerOpen(false)} />
          <div className="drawer">
            <div className="drawer-head">
              <h3>内部流转记录</h3>
              <button onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            <div className="drawer-body">
              {memoCount === 0 && <div className="drawer-empty">科室之间尚无内部函件往来。</div>}
              {events.map((e, i) => {
                if (e.type === "internal_memo")
                  return (
                    <div key={i} className="memo">
                      <div className="route">
                        {AGENT_MAP[e.from].dept} → {AGENT_MAP[e.to].dept} ｜ 内部函件
                      </div>
                      <div className="body">{e.text}</div>
                    </div>
                  );
                if (e.type === "internal_reply")
                  return (
                    <div key={i} className="memo reply">
                      <div className="route">
                        {AGENT_MAP[e.from].dept} → {AGENT_MAP[e.to].dept} ｜ 回函
                      </div>
                      <div className="body">{e.text}</div>
                    </div>
                  );
                return null;
              })}
            </div>
          </div>
        </>
      )}

      {viewDoc && (
        <div className="doc-mask" onClick={() => setViewDoc(null)}>
          <div className="document" onClick={(e) => e.stopPropagation()}>
            <button className="doc-close" onClick={() => setViewDoc(null)}>
              ✕
            </button>
            <div className="doc-dept">AI 政务服务大厅 · {viewDoc.dept}</div>
            <hr className="doc-rule" />
            <hr className="doc-rule" />
            <div className="doc-title">{viewDoc.docName}</div>
            <div className="doc-body">{viewDoc.content}</div>
            <div className="seal stamp-anim">
              <span className="star">✦</span>
              <span>
                AI政务服务大厅
                <br />
                {viewDoc.dept}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
