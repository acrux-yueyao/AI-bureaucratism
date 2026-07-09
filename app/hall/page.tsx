"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AGENT_MAP } from "@/lib/agents";
import { loadCase, saveCase } from "@/lib/storage";
import { SCENARIOS } from "@/lib/visitors";
import { digestsForAll, loadExperience } from "@/lib/experience";
import { loadArchive, renderArchiveDigest } from "@/lib/archive";
import { getLang, storeLang, t, type Lang } from "@/lib/i18n";
import IsoScene, {
  ISO_ENTRANCE,
  VIEW_H,
  VIEW_W,
  stationCenter,
  visitorSpot,
} from "./IsoHall";
import type {
  AgentId,
  AgentUiState,
  CaseEvent,
  CaseState,
  StreamFrame,
  VisitorMove,
} from "@/lib/types";

const MAX_OBSERVER_TURNS = 12;

type Flight = {
  id: number;
  from: AgentId;
  to: AgentId;
  reply: boolean;
  channel?: "peer" | "up" | "down";
};

function pct(p: { x: number; y: number }) {
  return { left: `${(p.x / VIEW_W) * 100}%`, top: `${(p.y / VIEW_H) * 100}%` };
}

const CHANNEL_COLOR = { peer: "#8fb96a", up: "#e0524d", down: "#7f93b5" };

function FlightPaper({ flight, onDone }: { flight: Flight; onDone: (id: number) => void }) {
  const [pos, setPos] = useState(() => stationCenter(flight.from));
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPos(stationCenter(flight.to)))
    );
    const timer = setTimeout(() => onDone(flight.id), 1500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [flight, onDone]);
  const c = CHANNEL_COLOR[flight.channel ?? "peer"];
  return (
    <div className="memo-fly" style={pct({ x: pos.x, y: pos.y - 38 })}>
      <svg width="24" height="18" viewBox="0 0 24 18" aria-hidden>
        <rect x="4" y="6" width="16" height="11" rx="3" fill="rgba(74,68,58,0.18)" />
        <rect
          x="4"
          y="3"
          width="16"
          height="11"
          rx="3"
          fill="#fff"
          stroke={c}
          strokeWidth="2"
          strokeDasharray={flight.reply ? "2.5 2.5" : undefined}
        />
      </svg>
    </div>
  );
}

function VisitorToken({ synthetic }: { synthetic: boolean }) {
  const c = synthetic ? "#e0524d" : "#37414f";
  return (
    <svg width="30" height="38" viewBox="0 0 30 38" aria-hidden>
      <ellipse cx="15" cy="34" rx="7" ry="2.6" fill="rgba(74,68,58,0.25)" />
      <path d="M15 33 C 4 19 4 5 15 5 C 26 5 26 19 15 33 Z" fill={c} stroke="#fff" strokeWidth="2.5" />
      <circle cx="15" cy="14" r="4.5" fill="#fff" />
    </svg>
  );
}

export default function HallPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [cs, setCs] = useState<CaseState | null>(null);
  const [current, setCurrent] = useState<AgentId | null>(null);
  const [path, setPath] = useState<(AgentId | "entrance")[]>(["entrance"]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"chat" | "docs" | "todos">("chat");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<{
    docName: string;
    content: string;
    dept: string;
    ts: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [statusMap, setStatusMap] = useState<
    Partial<Record<AgentId, { state: AgentUiState; target?: AgentId }>>
  >({});
  const [flights, setFlights] = useState<Flight[]>([]);
  const [stream, setStream] = useState<{ agentId: AgentId; text: string } | null>(null);
  const [observer, setObserver] = useState<{
    scenarioId: string;
    turn: number;
    note: string;
  } | null>(null);
  const flightId = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const csRef = useRef<CaseState | null>(null);
  const stopRef = useRef(false);
  const observerStarted = useRef(false);

  useEffect(() => {
    setLang(getLang());
    const c = loadCase();
    if (!c) {
      router.replace("/");
      return;
    }
    csRef.current = c;
    setCs(c);
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "observer") {
      const scenarioId = params.get("scenario") ?? "";
      if (SCENARIOS.some((s) => s.id === scenarioId)) {
        setObserver({ scenarioId, turn: 0, note: "" });
      }
    }
  }, [router]);

  const events = useMemo(() => cs?.events ?? [], [cs]);

  const closed = useMemo(
    () =>
      !!cs?.closed ||
      events.some((e) => e.type === "case_closed" || e.type === "user_abandoned"),
    [cs, events]
  );

  const memoCount = useMemo(
    () =>
      events.filter((e) => e.type === "internal_memo" || e.type === "internal_reply").length,
    [events]
  );

  const referralCount = useMemo(
    () => events.filter((e) => e.type === "referral").length,
    [events]
  );

  const docs = useMemo(
    () =>
      events.filter(
        (e): e is Extract<CaseEvent, { type: "document_issued" }> =>
          e.type === "document_issued"
      ),
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

  const memoRoutes = useMemo(() => {
    const counts = new Map<
      string,
      { from: AgentId; to: AgentId; n: number; channel: "peer" | "up" | "down" }
    >();
    for (const e of events) {
      if (e.type !== "internal_memo" && e.type !== "internal_reply") continue;
      const ch = e.channel ?? "peer";
      const key = [e.from, e.to].sort().join("|") + "|" + ch;
      const cur = counts.get(key);
      if (cur) cur.n += 1;
      else counts.set(key, { from: e.from, to: e.to, n: 1, channel: ch });
    }
    return [...counts.values()];
  }, [events]);

  const trailSegments = useMemo(() => {
    const counts = new Map<
      string,
      { a: AgentId | "entrance"; b: AgentId | "entrance"; n: number }
    >();
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      if (a === b) continue;
      const key = [a, b].sort().join("|");
      const cur = counts.get(key);
      if (cur) cur.n += 1;
      else counts.set(key, { a, b, n: 1 });
    }
    return [...counts.values()];
  }, [path]);

  const queueSize = useMemo(() => {
    if (cs?.conditionId === "rush") return 3;
    if (cs?.conditionId === "ninth_hour") return 2;
    return 0;
  }, [cs?.conditionId]);

  const chatItems = useMemo(() => {
    if (!current) return [];
    return events.filter((e) => {
      if (e.type === "user_message" || e.type === "agent_message")
        return e.agentId === current;
      if (
        e.type === "materials_required" ||
        e.type === "document_issued" ||
        e.type === "case_closed"
      )
        return e.agentId === current;
      if (e.type === "referral") return e.from === current;
      return false;
    });
  }, [events, current]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [chatItems.length, sending, tab, stream?.text.length]);

  const removeFlight = useCallback((id: number) => {
    setFlights((f) => f.filter((x) => x.id !== id));
  }, []);

  function toggleLang() {
    const next: Lang = lang === "en" ? "zh" : "en";
    setLang(next);
    storeLang(next);
  }

  const applyEvent = useCallback((e: CaseEvent) => {
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
    if (e.type === "agent_message") setStream(null);
    if (e.type === "internal_memo" || e.type === "internal_reply") {
      flightId.current += 1;
      setFlights((f) => [
        ...f,
        {
          id: flightId.current,
          from: e.from,
          to: e.to,
          reply: e.type === "internal_reply",
          channel: e.channel,
        },
      ]);
    }
  }, []);

  const goTo = useCallback((id: AgentId) => {
    setCurrent((cur) => {
      if (id === cur) return cur;
      setTab("chat");
      setPath((p) => [...p, id]);
      return id;
    });
  }, []);

  const rollbackUserMessage = useCallback((agentId: AgentId, text: string) => {
    const base = csRef.current;
    if (!base) return;
    const evs = [...base.events];
    for (let i = evs.length - 1; i >= 0; i--) {
      const e = evs[i];
      if (e.type === "user_message" && e.agentId === agentId && e.text === text) {
        evs.splice(i, 1);
        break;
      }
      if (e.type !== "user_message") break;
    }
    const merged: CaseState = { ...base, events: evs };
    csRef.current = merged;
    setCs(merged);
    saveCase(merged);
  }, []);

  const dispatch = useCallback(
    async (agentId: AgentId, text: string): Promise<boolean> => {
      const base = csRef.current;
      if (!base) return false;
      setError("");
      setSending(true);
      setStream(null);
      let productive = false;
      let failed = false;
      try {
        const res = await fetch("/api/window", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: base.caseId,
            matter: base.matter,
            agentId,
            userMessage: text,
            events: base.events,
            conditionId: base.conditionId,
            experience: digestsForAll(loadExperience()),
            archiveDigest: renderArchiveDigest(loadArchive()),
          }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          setError(
            (data as { error?: string } | null)?.error ?? "Request failed. Try again."
          );
          rollbackUserMessage(agentId, text);
          return false;
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
                if (frame.event.type !== "user_message") productive = true;
              } else if (frame.kind === "delta") {
                const d = frame;
                setStream((s) =>
                  s && s.agentId === d.agentId
                    ? { agentId: d.agentId, text: s.text + d.text }
                    : { agentId: d.agentId, text: d.text }
                );
              } else if (frame.signal.type === "status") {
                const s = frame.signal;
                setStatusMap((m) => ({
                  ...m,
                  [s.agentId]: { state: s.state, target: s.target },
                }));
              } else if (frame.signal.type === "error") {
                setError(frame.signal.message);
                failed = true;
              }
            }
          }
        }
        if (failed || !productive) {
          rollbackUserMessage(agentId, text);
          return false;
        }
        return true;
      } catch {
        setError("Request interrupted. Try again.");
        rollbackUserMessage(agentId, text);
        return false;
      } finally {
        setSending(false);
        setStream(null);
        setStatusMap({});
      }
    },
    [applyEvent, rollbackUserMessage]
  );

  async function send(preset?: string) {
    if (!current || sending || closed || observer) return;
    const text = (preset ?? input).trim();
    if (!text) return;
    if (!preset) setInput("");
    const ok = await dispatch(current, text);
    if (!ok && !preset) setInput(text);
  }

  async function walkAndReport(target: AgentId, fromDept: string) {
    if (sending || closed || observer) return;
    goTo(target);
    await new Promise((r) => setTimeout(r, 950));
    await dispatch(
      target,
      `Hello — I was directed here by the ${fromDept} window regarding my matter.`
    );
  }

  const runObserver = useCallback(async () => {
    const obs = observer;
    const base = csRef.current;
    if (!obs || !base) return;
    stopRef.current = false;
    for (let turn = 1; turn <= MAX_OBSERVER_TURNS; turn++) {
      if (stopRef.current) return;
      setObserver((o) => (o ? { ...o, turn } : o));
      let move: VisitorMove;
      try {
        const res = await fetch("/api/visitor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: base.caseId,
            matter: base.matter,
            scenarioId: obs.scenarioId,
            events: csRef.current?.events ?? [],
          }),
        });
        move = (await res.json()) as VisitorMove;
        if (!res.ok || move.error) {
          setError(move.error ?? "Visitor call failed.");
          return;
        }
      } catch {
        setError("Visitor call failed.");
        return;
      }
      if (stopRef.current) return;
      if (move.giveUp) {
        applyEvent({ type: "user_abandoned", ts: Date.now() });
        setObserver((o) => (o ? { ...o, note: t(getLang(), "visitorGaveUp") } : o));
        return;
      }
      goTo(move.target);
      await new Promise((r) => setTimeout(r, 1100));
      if (stopRef.current) return;
      let ok = await dispatch(move.target, move.message);
      if (!ok && !stopRef.current) {
        await new Promise((r) => setTimeout(r, 4000));
        ok = await dispatch(move.target, move.message);
      }
      if (!ok) {
        setObserver((o) => (o ? { ...o, note: "Stopped: window unresponsive." } : o));
        return;
      }
      if (csRef.current?.events.some((e) => e.type === "case_closed")) return;
    }
    setObserver((o) => (o ? { ...o, note: t(getLang(), "turnLimit") } : o));
  }, [observer, dispatch, applyEvent, goTo]);

  useEffect(() => {
    if (observer && !observerStarted.current && cs) {
      observerStarted.current = true;
      void runObserver();
    }
  }, [observer, cs, runObserver]);

  function leave() {
    const base = csRef.current;
    if (!base) return;
    if (!window.confirm(t(lang, "leaveConfirm"))) return;
    stopRef.current = true;
    const merged: CaseState = {
      ...base,
      events: closed
        ? base.events
        : [...base.events, { type: "user_abandoned", ts: Date.now() } as CaseEvent],
      closed: true,
    };
    csRef.current = merged;
    setCs(merged);
    saveCase(merged);
    router.push("/report");
  }

  if (!cs) return null;

  const cur = current ? AGENT_MAP[current] : null;
  const vSpot = current ? visitorSpot(current) : ISO_ENTRANCE;
  const scenario = observer ? SCENARIOS.find((s) => s.id === observer.scenarioId) : null;

  return (
    <main className="hall-page">
      <header className="gov-header">
        <div className="gov-header-inner">
          <a className="gov-logotype" href="/">
            {t(lang, "brand")}
          </a>
          <span className="hall-head-meta">
            {t(lang, "caseNo")} {cs.caseId} · {cs.matter}
          </span>
          {referralCount > 0 && (
            <span className="counter-chip">
              {referralCount} {t(lang, "referrals")}
            </span>
          )}
          <span className="right">
            <button onClick={() => setDrawerOpen(true)}>
              {t(lang, "internalLog")}
              {memoCount > 0 ? ` (${memoCount})` : ""}
            </button>
            {closed ? (
              <button onClick={() => router.push("/report")}>{t(lang, "viewReceipt")}</button>
            ) : (
              <button onClick={leave}>{t(lang, "endService")}</button>
            )}
            <button onClick={toggleLang}>{t(lang, "langToggle")}</button>
          </span>
        </div>
      </header>
      <div className="blue-bar" />

      {observer && scenario && (
        <div className="stress-banner">
          <span>
            {t(lang, "stressRunning")} — {scenario.name}
          </span>
          <span className="mono">
            turn {observer.turn}/{MAX_OBSERVER_TURNS}
          </span>
          {observer.note && <span>{observer.note}</span>}
          {!closed && !observer.note ? (
            <button
              className="btn-warn"
              onClick={() => {
                stopRef.current = true;
                setObserver((o) => (o ? { ...o, note: t(lang, "stopped") } : o));
              }}
            >
              ■ {t(lang, "stop")}
            </button>
          ) : (
            <button
              className="btn-plain"
              style={{ marginLeft: "auto" }}
              onClick={() => router.push("/report")}
            >
              {t(lang, "viewReceipt")} →
            </button>
          )}
        </div>
      )}

      {closed && !observer && (
        <div className="closed-banner">
          <strong>{t(lang, "caseClosedBanner")}</strong>
          <span>{t(lang, "seeReport")}</span>
          <button className="btn-plain" onClick={() => router.push("/report")}>
            {t(lang, "goSee")} →
          </button>
        </div>
      )}

      <div className="map-wrap iso">
        <IsoScene
          lang={lang}
          staffOnly={t(lang, "staffOnly")}
          current={current}
          suggested={suggested}
          observer={!!observer}
          statusMap={statusMap}
          queueSize={queueSize}
          trailSegments={trailSegments}
          memoRoutes={memoRoutes}
          onSelect={goTo}
        />
        <div
          className={"visitor" + (observer ? " synthetic" : "")}
          style={pct(vSpot)}
        >
          <VisitorToken synthetic={!!observer} />
        </div>
        {flights.map((f) => (
          <FlightPaper key={f.id} flight={f} onDone={removeFlight} />
        ))}
      </div>

      <div className="dock">
        <div className="dock-tabs">
          <button className={tab === "chat" ? "on" : ""} onClick={() => setTab("chat")}>
            {t(lang, "windowChat")}
            {cur ? ` · ${cur.dept}` : ""}
          </button>
          <button className={tab === "docs" ? "on" : ""} onClick={() => setTab("docs")}>
            {t(lang, "myDocuments")} ({docs.length})
          </button>
          <button className={tab === "todos" ? "on" : ""} onClick={() => setTab("todos")}>
            {t(lang, "requiredMaterials")} ({todos.length})
          </button>
        </div>

        {tab === "chat" && (
          <div className="dock-chat">
            {cur ? (
              <>
                <div className="counter-body" ref={bodyRef}>
                  {chatItems.length === 0 && !stream && (
                    <div className="sys-note">
                      {t(lang, "arrivedHint").replace("{dept}", cur.dept)}
                    </div>
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
                          {t(lang, "needMaterials")}{" "}
                          {e.items
                            .map((it) => it.name + (it.source ? ` (${it.source})` : ""))
                            .join(", ")}
                        </div>
                      );
                    if (e.type === "referral")
                      return (
                        <div key={i} className="sys-note">
                          {t(lang, "referredTo")} {AGENT_MAP[e.to].windowNo} [
                          {AGENT_MAP[e.to].dept}] — {e.reason}
                          {!observer && !closed && (
                            <button
                              className="btn-plain"
                              onClick={() => walkAndReport(e.to, AGENT_MAP[e.from].dept)}
                              disabled={sending}
                            >
                              {t(lang, "walkTo")} {AGENT_MAP[e.to].windowNo} →
                            </button>
                          )}
                        </div>
                      );
                    if (e.type === "document_issued")
                      return (
                        <div key={i} className="sys-note">
                          “{e.docName}” {t(lang, "docIssued")}{" "}
                          <a
                            href="#view"
                            onClick={(ev) => {
                              ev.preventDefault();
                              setViewDoc({
                                docName: e.docName,
                                content: e.content,
                                dept: AGENT_MAP[e.agentId].dept,
                                ts: e.ts,
                              });
                            }}
                          >
                            {t(lang, "clickView")}
                          </a>{" "}
                          — {t(lang, "inYourBag")}
                        </div>
                      );
                    if (e.type === "case_closed")
                      return (
                        <div key={i} className="sys-note">
                          {t(lang, "closedAs")}: {e.outcome} — {e.summary}
                        </div>
                      );
                    return null;
                  })}
                  {stream && stream.agentId === current && (
                    <div className="msg agent streaming">
                      <span className="who">
                        {cur.dept} · {cur.personName}
                      </span>
                      {stream.text}
                    </div>
                  )}
                  {sending && !(stream && stream.agentId === current) && (
                    <div className="sys-note">
                      <span className="spin" />
                      {t(lang, "processing")}
                    </div>
                  )}
                </div>
                {!observer && !closed && (
                  <div className="quick-row">
                    {[t(lang, "quickDocs"), t(lang, "quickWhat"), t(lang, "quickGo")].map(
                      (q) => (
                        <button
                          key={q}
                          className="chip"
                          onClick={() => send(q)}
                          disabled={sending}
                        >
                          {q}
                        </button>
                      )
                    )}
                  </div>
                )}
                {!observer && (
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
                      placeholder={
                        closed ? t(lang, "inputClosed") : t(lang, "inputPlaceholder")
                      }
                      disabled={sending || closed}
                    />
                    <button
                      className="btn-green"
                      onClick={() => send()}
                      disabled={sending || closed || !input.trim()}
                    >
                      {t(lang, "send")}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="counter-empty">
                <div>{t(lang, "approachHint")}</div>
                <div style={{ fontSize: 13 }}>{t(lang, "approachHint2")}</div>
              </div>
            )}
            {error && (
              <div className="err" style={{ margin: "0 16px 12px" }}>
                {error}
              </div>
            )}
          </div>
        )}

        {tab === "docs" && (
          <div className="dock-pane">
            {docs.length === 0 && <div className="empty">{t(lang, "noDocuments")}</div>}
            {docs.map((d, i) => (
              <button
                key={d.ts + "-" + i}
                className="doc-item stamped"
                onClick={() =>
                  setViewDoc({
                    docName: d.docName,
                    content: d.content,
                    dept: AGENT_MAP[d.agentId].dept,
                    ts: d.ts,
                  })
                }
              >
                “{d.docName}”<span className="ref">{AGENT_MAP[d.agentId].dept}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "todos" && (
          <div className="dock-pane">
            {todos.length === 0 && <div className="empty">{t(lang, "noneYet")}</div>}
            {todos.map((it, i) => (
              <div key={i} className="todo-item">
                {it.name}
                <em>
                  {" "}
                  — {AGENT_MAP[it.by].dept}
                  {it.source ? `, from ${it.source}` : ""}
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
              <h3>{t(lang, "internalLog")}</h3>
              <button onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            <div className="drawer-body">
              {memoCount === 0 && <div className="drawer-empty">{t(lang, "drawerEmpty")}</div>}
              {events.map((e, i) => {
                if (e.type === "internal_memo")
                  return (
                    <div key={i} className={"memo" + (e.channel ? ` ch-${e.channel}` : "")}>
                      <div className="route">
                        {AGENT_MAP[e.from].personName} → {AGENT_MAP[e.to].personName} ·{" "}
                        {e.channel === "up"
                          ? "escalation ↑"
                          : e.channel === "down"
                            ? "assignment ↓"
                            : t(lang, "memo")}
                      </div>
                      <div className="body">{e.text}</div>
                    </div>
                  );
                if (e.type === "internal_reply")
                  return (
                    <div key={i} className="memo reply">
                      <div className="route">
                        {AGENT_MAP[e.from].personName} → {AGENT_MAP[e.to].personName} ·{" "}
                        {t(lang, "replyMemo")}
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
            <div className="doc-head">
              <span className="doc-org">GOV.AI · Unified Government Services</span>
              <span className="doc-dept">{viewDoc.dept}</span>
            </div>
            <div className="doc-ref">
              REF: {cs.caseId}/{String(viewDoc.ts).slice(-5)} ·{" "}
              {new Date(viewDoc.ts).toISOString().slice(0, 10)}
            </div>
            <div className="doc-title">{viewDoc.docName}</div>
            <div className="doc-body">{viewDoc.content}</div>
            <div className="barcode" />
            <div className="barcode-ref">{cs.caseId}</div>
            <div className="ink-stamp stamp-anim">RECEIVED</div>
          </div>
        </div>
      )}
    </main>
  );
}
