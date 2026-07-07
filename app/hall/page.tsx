"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AGENTS, AGENT_MAP } from "@/lib/agents";
import { loadCase, saveCase } from "@/lib/storage";
import type { AgentId, CaseEvent, CaseState, WindowResponse } from "@/lib/types";

export default function HallPage() {
  const router = useRouter();
  const [cs, setCs] = useState<CaseState | null>(null);
  const [current, setCurrent] = useState<AgentId | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<{ docName: string; content: string; dept: string } | null>(null);
  const [error, setError] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = loadCase();
    if (!c) {
      router.replace("/");
      return;
    }
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
  }, [chatItems.length, sending]);

  async function send() {
    if (!cs || !current || sending || closed) return;
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
          caseId: cs.caseId,
          matter: cs.matter,
          agentId: current,
          userMessage: text,
          events: cs.events,
        }),
      });
      const data = (await res.json()) as WindowResponse;
      const merged: CaseState = {
        ...cs,
        events: [...cs.events, ...(data.newEvents ?? [])],
        closed: cs.closed || (data.newEvents ?? []).some((e) => e.type === "case_closed"),
      };
      setCs(merged);
      saveCase(merged);
      if (data.error) setError(data.error);
    } catch {
      setError("网络请求失败，请重试。");
    } finally {
      setSending(false);
    }
  }

  function abandon() {
    if (!cs) return;
    if (!window.confirm("确定要结束办理并离开大厅吗？办件档案将保留，可查看观察报告。")) return;
    const merged: CaseState = {
      ...cs,
      events: closed ? cs.events : [...cs.events, { type: "user_abandoned", ts: Date.now() }],
      closed: true,
    };
    setCs(merged);
    saveCase(merged);
    router.push("/report");
  }

  if (!cs) return null;

  const cur = current ? AGENT_MAP[current] : null;

  return (
    <main>
      <div className="hall-header">
        <div className="hall-header-inner">
          <span className="brand">AI 政务服务大厅</span>
          <span className="meta">
            办件编号 {cs.caseId} ｜ 事项：{cs.matter}
          </span>
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
        <div className="closed-banner" style={{ marginTop: 14 }}>
          <strong>本件已终止办理。</strong>
          <span>您可以查看办件回执与观察报告。</span>
          <button className="btn" onClick={() => router.push("/report")}>
            前往查看
          </button>
        </div>
      )}

      <div className="hall">
        <aside className="window-list">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              className={
                "window-card" +
                (current === a.id ? " active" : "") +
                (suggested === a.id && current !== a.id ? " suggested" : "")
              }
              onClick={() => setCurrent(a.id)}
            >
              <span className="no">{a.windowNo}</span>
              <div>
                <h4>{a.dept}</h4>
                <p>{a.personName} · 在岗</p>
              </div>
              {suggested === a.id && current !== a.id && <span className="tag">请前往</span>}
            </button>
          ))}
        </aside>

        <section className="card counter">
          {cur ? (
            <>
              <div className="counter-head">
                <h3>
                  {cur.windowNo} 号窗口 · {cur.dept}
                </h3>
                <span>
                  工作人员：{cur.personName}（{cur.staffId}）
                </span>
              </div>
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
                            setViewDoc({ docName: e.docName, content: e.content, dept: AGENT_MAP[e.agentId].dept });
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
                    窗口正在办理，可能正在与其他科室内部沟通…
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
                <button className="btn-primary" style={{ height: 60 }} onClick={send} disabled={sending || closed || !input.trim()}>
                  提交
                </button>
              </div>
            </>
          ) : (
            <div className="counter-empty">
              <div className="glyph">▤</div>
              <div>请在左侧选择一个窗口，前往办理您的事项。</div>
              <div style={{ fontSize: 12 }}>不确定去哪个窗口？可以先到 01 号【综合导办】问路。</div>
            </div>
          )}
          {error && <div className="err" style={{ margin: "0 16px 12px" }}>{error}</div>}
        </section>

        <aside className="side">
          <div className="card">
            <h3>我的材料袋（{docs.length}）</h3>
            {docs.length === 0 && <div className="empty">尚未取得任何文书。</div>}
            {docs.map((d, i) => (
              <button
                key={i}
                className="doc-item"
                onClick={() => setViewDoc({ docName: d.docName, content: d.content, dept: AGENT_MAP[d.agentId].dept })}
              >
                <span className="seal-dot" />《{d.docName}》<span>{AGENT_MAP[d.agentId].dept}</span>
              </button>
            ))}
          </div>
          <div className="card">
            <h3>被要求提供的材料（{todos.length}）</h3>
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
          <div className="card">
            <h3>办件说明</h3>
            <div className="empty" style={{ lineHeight: 1.8 }}>
              本大厅所有窗口工作人员均为 AI Agent，各自只知道自己的职责与边界。他们如何办理您的事项，没有预设脚本。
            </div>
          </div>
        </aside>
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
            <div className="seal">
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
