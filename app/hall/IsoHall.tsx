"use client";

import type { AgentId, AgentUiState } from "@/lib/types";
import { AGENTS, AGENT_MAP } from "@/lib/agents";

// The hall as a flat, top-down miniature transit map (Mini Motorways
// language): departments are rounded color-blocked buildings, the visitor's
// walked segments pave themselves into white roads, memos travel as little
// paper "cars", and waiting visitors stack up as demand pins. Terrain is a
// pair of soft pastel fields on warm paper.

export const VIEW_W = 1200;
export const VIEW_H = 660;

type Spot = { x: number; y: number };

// Building centers.
export const ISO_STATIONS: Record<AgentId, Spot & { r?: number; small?: boolean }> = {
  director: { x: 600, y: 84, r: 36 },
  chief_front: { x: 372, y: 100, r: 27 },
  chief_back: { x: 828, y: 100, r: 27 },
  trainee_front: { x: 866, y: 258, small: true },
  trainee_back: { x: 78, y: 438, small: true },
  daoban: { x: 210, y: 272 },
  shouli: { x: 470, y: 272 },
  cailiao: { x: 730, y: 272 },
  zige: { x: 990, y: 272 },
  dangan: { x: 210, y: 452 },
  quanxian: { x: 470, y: 452 },
  fengkong: { x: 730, y: 452 },
  fuhe: { x: 990, y: 452 },
};

export const ISO_ENTRANCE: Spot = { x: 600, y: 594 };

export function stationCenter(id: AgentId): Spot {
  const s = ISO_STATIONS[id];
  return { x: s.x, y: s.y };
}

export function visitorSpot(id: AgentId | null): Spot {
  if (!id) return { x: ISO_ENTRANCE.x + 46, y: ISO_ENTRANCE.y - 8 };
  const s = ISO_STATIONS[id];
  return { x: s.x + (s.small ? 34 : 54), y: s.y + (s.small ? 26 : 44) };
}

// ── palette (curated, Mini-Motorways-ish) ──
const BUILDING: Record<AgentId, string> = {
  daoban: "#f2a541",
  shouli: "#e0524d",
  cailiao: "#d96aa8",
  zige: "#9a6dd7",
  dangan: "#3aa88f",
  quanxian: "#4d7fd0",
  fengkong: "#7ab648",
  fuhe: "#5b6472",
  director: "#37414f",
  chief_front: "#c96f5e",
  chief_back: "#7f93b5",
  trainee_front: "#e8c05a",
  trainee_back: "#e8c05a",
};

const P = {
  paper: "#f6f3ee",
  shadow: "rgba(74, 68, 58, 0.16)",
  roadOutline: "#dcd6c8",
  road: "#ffffff",
  ink: "#3f4550",
  faint: "#9a958a",
  blush: "#f5d7db",
  aqua: "#c4e7e2",
  slateZone: "#e0e4ec",
  peer: "#8fb96a",
  up: "#e0524d",
  down: "#7f93b5",
  pin: "#37414f",
};

const STATE_TEXT: Record<AgentUiState, string> = {
  receiving: "attending",
  consulting: "memo out",
  replying: "drafting",
  idle: "",
};

function elbow(a: Spot, b: Spot): string {
  const midY = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y}`;
}

export type IsoSceneProps = {
  lang: "en" | "zh";
  staffOnly: string;
  current: AgentId | null;
  suggested: AgentId | null;
  observer: boolean;
  statusMap: Partial<Record<AgentId, { state: AgentUiState; target?: AgentId }>>;
  queueSize: number;
  trailSegments: { a: AgentId | "entrance"; b: AgentId | "entrance"; n: number }[];
  memoRoutes: { from: AgentId; to: AgentId; n: number; channel: "peer" | "up" | "down" }[];
  onSelect: (id: AgentId) => void;
};

function pointOf(p: AgentId | "entrance"): Spot {
  return p === "entrance" ? ISO_ENTRANCE : stationCenter(p);
}

export default function IsoScene({
  staffOnly,
  current,
  suggested,
  observer,
  statusMap,
  queueSize,
  trailSegments,
  memoRoutes,
  onSelect,
}: IsoSceneProps) {
  const channelColor = { peer: P.peer, up: P.up, down: P.down };
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <pattern
          id="mmHatch"
          width="12"
          height="12"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="12" height="12" fill="#ece6d8" />
          <rect width="6" height="12" fill="#e0d9c6" />
        </pattern>
        <clipPath id="mmPanel">
          <rect x="16" y="16" width={VIEW_W - 32} height={VIEW_H - 32} rx="12" />
        </clipPath>
      </defs>

      {/* hatched picture frame + paper panel */}
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#mmHatch)" />
      <rect
        x="16"
        y="16"
        width={VIEW_W - 32}
        height={VIEW_H - 32}
        rx="12"
        fill={P.paper}
        stroke="#d8d1bf"
        strokeWidth="1.5"
      />

      <g clipPath="url(#mmPanel)">
      {/* soft terrain fields */}
      <path
        d="M -40 430 C 140 350, 220 520, 420 480 C 560 452, 560 620, 380 680 L -40 680 Z"
        fill={P.blush}
        opacity="0.75"
      />
      <path
        d="M 880 -30 C 830 120, 1010 170, 1050 300 C 1085 415, 960 480, 1010 620 C 1040 700, 1240 690, 1240 690 L 1240 -30 Z"
        fill={P.aqua}
        opacity="0.8"
      />
      <path
        d="M 1030 690 C 1000 560, 1120 520, 1240 560 L 1240 690 Z"
        fill={P.blush}
        opacity="0.6"
      />

      {/* staff zone */}
      <path
        d="M 240 -20 C 210 90, 330 160, 600 158 C 870 160, 990 90, 960 -20 Z"
        fill={P.slateZone}
        opacity="0.9"
      />
      <text
        x="600"
        y="150"
        textAnchor="middle"
        fontSize="10"
        letterSpacing="4"
        fill={P.faint}
        fontWeight="700"
      >
        {staffOnly}
      </text>

      {/* paved visitor roads */}
      {trailSegments.map((t, i) => {
        const a = pointOf(t.a);
        const b = pointOf(t.b);
        const w = 9 + Math.min(t.n, 4) * 2.5;
        return (
          <g key={"t" + i} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={elbow(a, b)} stroke={P.roadOutline} strokeWidth={w + 5} />
            <path d={elbow(a, b)} stroke={P.road} strokeWidth={w} />
            {t.n > 1 && (
              <path
                d={elbow(a, b)}
                stroke={P.roadOutline}
                strokeWidth="1.6"
                strokeDasharray="1 14"
              />
            )}
          </g>
        );
      })}

      {/* memo lines */}
      {memoRoutes.map((m, i) => {
        const a = stationCenter(m.from);
        const b = stationCenter(m.to);
        const midx = (a.x + b.x) / 2;
        const midy = Math.min(a.y, b.y) - 60 - Math.min(m.n, 4) * 8;
        const c = channelColor[m.channel];
        return (
          <g key={"m" + i}>
            <path
              d={`M ${a.x} ${a.y - 30} Q ${midx} ${midy} ${b.x} ${b.y - 30}`}
              stroke={c}
              strokeWidth="2.5"
              strokeDasharray="7 7"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
            {m.n > 1 && (
              <g transform={`translate(${midx}, ${midy + 16})`}>
                <rect x="-15" y="-9" width="30" height="18" rx="9" fill="#fff" stroke={c} strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={c}>
                  ×{m.n}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* entrance */}
      <g>
        <rect x={ISO_ENTRANCE.x - 40} y={ISO_ENTRANCE.y - 26} width="80" height="52" rx="14" fill="#fff" stroke={P.roadOutline} strokeWidth="2" transform={`translate(0,4)`} opacity="0.5" />
        <rect x={ISO_ENTRANCE.x - 40} y={ISO_ENTRANCE.y - 26} width="80" height="52" rx="14" fill="#fff" stroke={P.ink} strokeWidth="2.5" />
        <path
          d={`M ${ISO_ENTRANCE.x - 12} ${ISO_ENTRANCE.y + 26} v-20 a12 12 0 0 1 24 0 v20`}
          fill={P.paper}
          stroke={P.ink}
          strokeWidth="2.5"
        />
        <text
          x={ISO_ENTRANCE.x}
          y={ISO_ENTRANCE.y - 36}
          textAnchor="middle"
          fontSize="10"
          letterSpacing="3"
          fill={P.faint}
          fontWeight="700"
        >
          ENTRANCE
        </text>
      </g>

      {/* stations */}
      {AGENTS.map((a) => {
        const s = ISO_STATIONS[a.id];
        const st = statusMap[a.id];
        const busy = !!st && st.state !== "idle";
        const isWindow = a.level === 3;
        const color = BUILDING[a.id];
        const round = s.r !== undefined;
        const size = s.small ? 40 : 76;

        return (
          <g
            key={a.id}
            onClick={() => isWindow && !observer && onSelect(a.id)}
            style={isWindow && !observer ? { cursor: "pointer" } : undefined}
          >
            {/* selection ring */}
            {current === a.id && (
              <rect
                x={s.x - size / 2 - 9}
                y={s.y - size / 2 - 9}
                width={size + 18}
                height={size + 18}
                rx={24}
                fill="none"
                stroke={P.ink}
                strokeWidth="2.5"
                strokeDasharray="4 8"
                strokeLinecap="round"
              />
            )}

            {/* building */}
            {round ? (
              <>
                <circle cx={s.x} cy={s.y + 4} r={s.r} fill={P.shadow} />
                <circle cx={s.x} cy={s.y} r={s.r} fill={color} />
                <circle cx={s.x} cy={s.y} r={(s.r ?? 27) - 7} fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.85" />
              </>
            ) : (
              <>
                <rect
                  x={s.x - size / 2}
                  y={s.y - size / 2 + 4}
                  width={size}
                  height={size}
                  rx={s.small ? 12 : 18}
                  fill={P.shadow}
                />
                <rect
                  x={s.x - size / 2}
                  y={s.y - size / 2}
                  width={size}
                  height={size}
                  rx={s.small ? 12 : 18}
                  fill={color}
                />
              </>
            )}

            {/* busy glow ring */}
            {busy && (
              <circle cx={s.x} cy={s.y} r={(round ? (s.r ?? 27) : size / 2) + 7} fill="none" stroke={color} strokeWidth="3" opacity="0.5">
                <animate attributeName="r" values={`${(round ? (s.r ?? 27) : size / 2) + 5};${(round ? (s.r ?? 27) : size / 2) + 11};${(round ? (s.r ?? 27) : size / 2) + 5}`} dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.55;0.15;0.55" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}

            {/* label inside */}
            {isWindow ? (
              <text x={s.x} y={s.y + 9} textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">
                {a.windowNo}
              </text>
            ) : s.small ? (
              <text x={s.x} y={s.y + 4.5} textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">
                {a.personName.split(" ")[0][0]}
                {a.personName.split(" ")[1]?.[0] ?? ""}
              </text>
            ) : (
              <text x={s.x} y={s.y + 4.5} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" letterSpacing="1">
                {a.level === 1 ? "DIR" : a.id === "chief_front" ? "CH·F" : "CH·B"}
              </text>
            )}

            {/* caption */}
            <text
              x={s.x}
              y={s.y + (round ? (s.r ?? 27) : size / 2) + (s.small ? 15 : 20)}
              textAnchor="middle"
              fontSize={s.small ? 9 : 10.5}
              letterSpacing="1.5"
              fontWeight="700"
              fill={P.faint}
            >
              {(s.small ? a.personName.split(" ")[0] : a.dept).toUpperCase()}
            </text>
            {isWindow && (
              <text x={s.x} y={s.y + size / 2 + 34} textAnchor="middle" fontSize="9.5" fill={P.faint}>
                {a.personName}
                {a.status ? " · probation" : ""}
              </text>
            )}

            {/* status pill */}
            {busy && st && (
              <g transform={`translate(${s.x}, ${s.y - (round ? (s.r ?? 27) : size / 2) - 20})`}>
                <rect x="-54" y="-11" width="108" height="21" rx="10.5" fill={P.ink} />
                <text x="0" y="3.8" textAnchor="middle" fontSize="10" fill="#fff" letterSpacing="0.5" fontWeight="600">
                  {st.state === "consulting" && st.target
                    ? `MEMO → ${AGENT_MAP[st.target].personName.split(" ")[0].toUpperCase()}`
                    : STATE_TEXT[st.state].toUpperCase()}
                </text>
              </g>
            )}

            {/* go-here map pin */}
            {suggested === a.id && current !== a.id && !observer && (
              <g transform={`translate(${s.x}, ${s.y - size / 2 - 26})`}>
                <g>
                  <animateTransform attributeName="transform" type="translate" values="0 0; 0 -7; 0 0" dur="0.9s" repeatCount="indefinite" />
                  <path d="M0 10 C -9 -2 -9 -14 0 -14 C 9 -14 9 -2 0 10 Z" fill={P.up} />
                  <circle cx="0" cy="-6" r="4" fill="#fff" />
                </g>
              </g>
            )}

            {/* demand pins (queue) */}
            {isWindow && queueSize > 0 && (
              <g>
                {Array.from({ length: queueSize }).map((_, qi) => (
                  <g key={qi} transform={`translate(${s.x - size / 2 - 16}, ${s.y - size / 2 + 10 + qi * 18})`}>
                    <circle cx="0" cy="0" r="6.5" fill="#fff" stroke={color} strokeWidth="2.5" />
                    <circle cx="0" cy="0" r="2.4" fill={color} />
                  </g>
                ))}
              </g>
            )}
          </g>
        );
      })}
      </g>
    </svg>
  );
}
