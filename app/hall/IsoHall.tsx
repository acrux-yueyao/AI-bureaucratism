"use client";

import type { AgentId, AgentUiState } from "@/lib/types";
import { AGENTS, AGENT_MAP } from "@/lib/agents";

// The hall as an isometric miniature bureau. One light source (upper left),
// soft shadows, desks with three faces, props that carry each officer's
// persona. ViewBox is 1200×660; overlay elements (visitor, flying memos)
// position themselves as percentages of that box.

export const VIEW_W = 1200;
export const VIEW_H = 660;

// Anchor = west corner of the desk's top face.
type Station = {
  x: number;
  y: number;
  small?: boolean;
  mezz?: boolean;
};

export const ISO_STATIONS: Record<AgentId, Station> = {
  director: { x: 545, y: 84, mezz: true },
  chief_front: { x: 265, y: 108, mezz: true },
  chief_back: { x: 830, y: 108, mezz: true },
  daoban: { x: 105, y: 268 },
  shouli: { x: 375, y: 268 },
  cailiao: { x: 645, y: 268 },
  zige: { x: 915, y: 268 },
  trainee_front: { x: 795, y: 210, small: true },
  trainee_back: { x: 40, y: 462, small: true },
  dangan: { x: 105, y: 418 },
  quanxian: { x: 375, y: 418 },
  fengkong: { x: 645, y: 418 },
  fuhe: { x: 915, y: 418 },
};

export const ISO_ENTRANCE = { x: 585, y: 596 };

// Where the visitor stands when at a window, and where flights aim.
export function stationCenter(id: AgentId): { x: number; y: number } {
  const s = ISO_STATIONS[id];
  const w = s.small ? 0.7 : 1;
  return { x: s.x + 62 * w, y: s.y + 34 * w };
}

export function visitorSpot(id: AgentId | null): { x: number; y: number } {
  if (!id) return ISO_ENTRANCE;
  const s = ISO_STATIONS[id];
  const w = s.small ? 0.7 : 1;
  return { x: s.x + 34 * w, y: s.y + 96 * w };
}

// ── palette ──
const P = {
  floor: "#e9e2d2",
  floorLine: "#ddd4c0",
  mezzTop: "#dfd7c3",
  mezzFace: "#c9bfa5",
  deskTop: "#dcccab",
  deskRight: "#b9a685",
  deskLeft: "#cbb997",
  shadow: "rgba(60,54,43,0.13)",
  skin: "#f0d7bd",
  officer: "#5f8d8a",
  officerDark: "#54807d",
  chief: "#b56a54",
  trainee: "#d9a648",
  director: "#3a4350",
  visitorGray: "#8b93a3",
  ink: "#43403a",
  faint: "#8a8378",
  plate: "#fffdf6",
  plateEdge: "#cfc5ac",
  clay: "#b56a54",
  sage: "#7fae5c",
  slate: "#6b7a92",
  glow: "#ffd98a",
};

const RANK_COLOR: Record<number, string> = {
  1: P.director,
  2: P.chief,
  3: P.officer,
  4: P.trainee,
};

// slope-consistent parallelogram helpers (rise = run/2)
function para(x: number, y: number, w: number, d: number): string {
  // top face: west corner → north-east along U(w, w/2)… we use a flat
  // "showroom" desk: front edge horizontal-ish for readability
  return `${x},${y} ${x + w * 0.72}, ${y - w * 0.36} ${x + w * 0.72 + d * 0.6},${
    y - w * 0.36 + d * 0.3
  } ${x + d * 0.6},${y + d * 0.3}`;
}

function Desk({
  x,
  y,
  scale = 1,
  busy,
}: {
  x: number;
  y: number;
  scale?: number;
  busy?: boolean;
}) {
  const w = 120 * scale;
  const d = 64 * scale;
  const h = 30 * scale;
  const topY = y;
  // corners of top face
  const A = { x, y: topY };
  const B = { x: x + w * 0.72, y: topY - w * 0.36 };
  const C = { x: B.x + d * 0.6, y: B.y + d * 0.3 };
  const D = { x: x + d * 0.6, y: topY + d * 0.3 };
  return (
    <g>
      <ellipse
        cx={x + w * 0.42}
        cy={y + d * 0.3 + h * 0.7}
        rx={w * 0.62}
        ry={h * 0.55}
        fill={P.shadow}
      />
      {busy && (
        <ellipse
          cx={(A.x + C.x) / 2}
          cy={(A.y + C.y) / 2}
          rx={w * 0.52}
          ry={w * 0.26}
          fill="url(#lampGlow)"
        />
      )}
      <polygon points={`${B.x},${B.y} ${C.x},${C.y} ${C.x},${C.y + h} ${B.x},${B.y + h}`} fill={P.deskRight} />
      <polygon points={`${D.x},${D.y} ${C.x},${C.y} ${C.x},${C.y + h} ${D.x},${D.y + h}`} fill={P.deskLeft} />
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y} ${D.x},${D.y}`} fill={P.deskTop} />
      {/* papers on the desk */}
      <polygon
        points={para(x + w * 0.18, y - w * 0.02, 16 * scale, 12 * scale)}
        fill={P.plate}
        stroke={P.plateEdge}
        strokeWidth="0.7"
      />
    </g>
  );
}

function Person({
  x,
  y,
  color,
  scale = 1,
  seated,
}: {
  x: number;
  y: number;
  color: string;
  scale?: number;
  seated?: boolean;
}) {
  const s = scale;
  return (
    <g>
      {!seated && <ellipse cx={x} cy={y + 20 * s} rx={11 * s} ry={4.5 * s} fill={P.shadow} />}
      <rect
        x={x - 6 * s}
        y={y - (seated ? 8 : 4) * s}
        width={12 * s}
        height={(seated ? 15 : 22) * s}
        rx={6 * s}
        fill={color}
      />
      <circle cx={x} cy={y - (seated ? 14 : 10) * s} r={5.6 * s} fill={P.skin} />
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g>
      <rect x={x - 4 * s} y={y} width={8 * s} height={7 * s} rx={1.5} fill={P.clay} />
      <path
        d={`M${x} ${y} q${-6 * s} ${-9 * s} ${-1 * s} ${-13 * s} M${x} ${y} q${5 * s} ${-8 * s} ${8 * s} ${-4 * s} M${x} ${y} q${1 * s} ${-11 * s} ${4 * s} ${-13 * s}`}
        stroke={P.sage}
        strokeWidth={2 * s}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

function Shelf({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon points={`${x},${y} ${x + 34},${y - 17} ${x + 34},${y + 34} ${x},${y + 51}`} fill="#c8bfae" />
      <polygon points={`${x + 34},${y - 17} ${x + 46},${y - 11} ${x + 46},${y + 40} ${x + 34},${y + 34}`} fill="#a89a82" />
      <polygon points={`${x},${y} ${x + 34},${y - 17} ${x + 46},${y - 11} ${x + 12},${y + 6}`} fill="#ded6c6" />
      <path d={`M${x + 3} ${y + 13} l31 -15 M${x + 3} ${y + 26} l31 -15 M${x + 3} ${y + 39} l31 -15`} stroke="#a89a82" strokeWidth="2.5" />
    </g>
  );
}

function Sign({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g>
      <path d={`M${x} ${y} v${-26 * s}`} stroke="#6c6252" strokeWidth={2.5 * s} />
      <polygon
        points={`${x - 2 * s},${y - 26 * s} ${x + 20 * s},${y - 33 * s} ${x + 24 * s},${y - 28 * s} ${x + 2 * s},${y - 21 * s}`}
        fill={P.clay}
      />
    </g>
  );
}

function Trays({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={P.plateEdge} strokeWidth="0.8">
      <polygon points={para(x, y, 20, 14)} fill={P.plate} />
      <polygon points={para(x, y - 6, 20, 14)} fill={P.plate} />
      <polygon points={para(x, y - 12, 20, 14)} fill={P.plate} />
    </g>
  );
}

function Cups({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y - 8} width={6} height={8} rx={1.5} fill={P.plate} stroke={P.plateEdge} strokeWidth="0.7" />
      <rect x={x + 9} y={y - 7} width={5.5} height={7} rx={1.5} fill={P.plate} stroke={P.plateEdge} strokeWidth="0.7" />
      <path d={`M${x + 2} ${y - 11} q1 -3 2 0 M${x + 11} ${y - 10} q1 -2.5 2 0`} stroke={P.faint} strokeWidth="0.9" fill="none" />
    </g>
  );
}

function Box({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon points={`${x},${y} ${x + 16},${y - 8} ${x + 28},${y - 2} ${x + 12},${y + 6}`} fill="#d9c9a8" />
      <polygon points={`${x},${y} ${x + 12},${y + 6} ${x + 12},${y + 18} ${x},${y + 12}`} fill="#bfae8c" />
      <polygon points={`${x + 12},${y + 6} ${x + 28},${y - 2} ${x + 28},${y + 10} ${x + 12},${y + 18}`} fill="#cbb997" />
      <path d={`M${x + 6} ${y + 3} l16 -8`} stroke="#a6957a" strokeWidth="1.5" />
    </g>
  );
}

function Rower({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#6c6252" strokeWidth="2" fill="none" strokeLinecap="round">
      <path d={`M${x} ${y} l30 -12`} />
      <path d={`M${x + 6} ${y - 2.5} v-7 M${x + 22} ${y - 9} v-6`} />
      <circle cx={x + 2} cy={y + 1} r={2.6} fill="#6c6252" />
    </g>
  );
}

function Flag({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y} v-40`} stroke="#6c6252" strokeWidth="2.5" />
      <path d={`M${x} ${y - 40} q10 3 20 0 v12 q-10 3 -20 0 z`} fill={P.slate} />
    </g>
  );
}

function Stanchions({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y} v-11 M${x + 34} ${y + 13} v-11`} stroke={P.faint} strokeWidth="2.2" />
      <circle cx={x} cy={y - 11.5} r={2.4} fill={P.faint} />
      <circle cx={x + 34} cy={y + 1.5} r={2.4} fill={P.faint} />
      <path d={`M${x + 2} ${y - 9} Q${x + 18} ${y} ${x + 32} ${y + 3}`} stroke={P.clay} strokeWidth="1.7" fill="none" />
    </g>
  );
}

const PROPS: Partial<Record<AgentId, (s: Station) => React.ReactNode>> = {
  daoban: (s) => <Sign x={s.x + 108} y={s.y + 34} />,
  shouli: (s) => <Plant x={s.x + 96} y={s.y - 26} />,
  cailiao: (s) => (
    <g stroke={P.plateEdge} strokeWidth="0.7">
      <polygon points={para(s.x + 58, s.y - 22, 18, 13)} fill={P.plate} />
      <polygon points={para(s.x + 58, s.y - 26, 18, 13)} fill={P.plate} />
      <polygon points={para(s.x + 58, s.y - 30, 18, 13)} fill={P.plate} />
    </g>
  ),
  zige: (s) => <Box x={s.x + 118} y={s.y + 52} />,
  dangan: (s) => <Shelf x={s.x - 42} y={s.y - 4} />,
  quanxian: (s) => <Trays x={s.x + 60} y={s.y - 22} />,
  fengkong: (s) => <Cups x={s.x + 62} y={s.y - 22} />,
  fuhe: (s) => <Plant x={s.x + 122} y={s.y + 46} s={0.85} />,
  director: (s) => (
    <g>
      <Flag x={s.x + 108} y={s.y + 22} />
      <Rower x={s.x - 52} y={s.y + 40} />
    </g>
  ),
  chief_front: (s) => <Cups x={s.x + 60} y={s.y - 18} />,
  chief_back: (s) => (
    <polygon points={para(s.x + 58, s.y - 20, 22, 8)} fill={P.plate} stroke={P.plateEdge} strokeWidth="0.8" />
  ),
  trainee_front: (s) => (
    <polygon points={para(s.x + 40, s.y - 14, 14, 10)} fill={P.plate} stroke={P.plateEdge} strokeWidth="0.7" />
  ),
  trainee_back: (s) => (
    <polygon points={para(s.x + 40, s.y - 14, 14, 10)} fill={P.plate} stroke={P.plateEdge} strokeWidth="0.7" />
  ),
};

const STATE_TEXT: Record<AgentUiState, string> = {
  receiving: "attending",
  consulting: "memo out",
  replying: "drafting",
  idle: "",
};

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

function pointOf(p: AgentId | "entrance") {
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
  const channelColor = { peer: P.sage, up: P.clay, down: P.slate };
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={P.glow} stopOpacity="0.5" />
          <stop offset="100%" stopColor={P.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* floor */}
      <polygon points={`600,6 1194,300 600,594 6,300`} fill={P.floor} />
      <g stroke={P.floorLine} strokeWidth="1" opacity="0.75">
        {[1, 2, 3, 4, 5].map((i) => (
          <path key={"a" + i} d={`M${600 - i * 99} ${6 + i * 49} L${1194 - i * 99} ${300 + i * 49}`} />
        ))}
        {[1, 2, 3, 4, 5].map((i) => (
          <path key={"b" + i} d={`M${600 + i * 99} ${6 + i * 49} L${6 + i * 99} ${300 + i * 49}`} />
        ))}
      </g>

      {/* mezzanine */}
      <polygon points={`600,12 1130,277 1044,320 514,55`} fill={P.mezzTop} opacity="0.95" />
      <polygon points={`514,55 1044,320 1044,334 514,69`} fill={P.mezzFace} />
      <g stroke="#b0a88f" strokeWidth="2">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} d={`M${560 + i * 76} ${78 + i * 38} v-15`} />
        ))}
        <path d="M560 63 L1016 291" strokeWidth="1.4" />
      </g>

      {/* worn visitor trails on the floor */}
      {trailSegments.map((t, i) => {
        const a = pointOf(t.a);
        const b = pointOf(t.b);
        return (
          <path
            key={"t" + i}
            d={`M${a.x} ${a.y + 40} Q ${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + 60} ${b.x} ${b.y + 40}`}
            stroke="#cdbfa2"
            strokeWidth={2 + Math.min(t.n, 4) * 1.2}
            strokeLinecap="round"
            fill="none"
            opacity={0.28 + Math.min(t.n, 5) * 0.07}
          />
        );
      })}

      {/* memo arcs */}
      {memoRoutes.map((m, i) => {
        const a = stationCenter(m.from);
        const b = stationCenter(m.to);
        const midx = (a.x + b.x) / 2;
        const midy = Math.min(a.y, b.y) - 46 - Math.min(m.n, 4) * 6;
        return (
          <g key={"m" + i}>
            <path
              d={`M${a.x} ${a.y - 14} Q ${midx} ${midy} ${b.x} ${b.y - 14}`}
              stroke={channelColor[m.channel]}
              strokeWidth="1.5"
              strokeDasharray="6 5"
              fill="none"
              opacity="0.75"
            />
            {m.n > 1 && (
              <text x={midx} y={midy + 8} textAnchor="middle" fontSize="12" fill={channelColor[m.channel]} fontWeight="600">
                ×{m.n}
              </text>
            )}
          </g>
        );
      })}

      {/* stations */}
      {AGENTS.map((a) => {
        const s = ISO_STATIONS[a.id];
        const scale = s.small ? 0.7 : 1;
        const st = statusMap[a.id];
        const busy = !!st && st.state !== "idle";
        const isWindow = a.level === 3;
        const center = stationCenter(a.id);
        return (
          <g
            key={a.id}
            onClick={() => isWindow && !observer && onSelect(a.id)}
            style={isWindow && !observer ? { cursor: "pointer" } : undefined}
          >
            {current === a.id && (
              <ellipse cx={center.x} cy={center.y + 34} rx={86} ry={40} fill="none" stroke={P.slate} strokeWidth="2" strokeDasharray="3 6" opacity="0.85" />
            )}
            <Desk x={s.x} y={s.y} scale={scale} busy={busy} />
            <Person
              x={s.x + 74 * scale}
              y={s.y - 26 * scale}
              color={RANK_COLOR[a.level]}
              scale={scale * 0.95}
              seated
            />
            {PROPS[a.id]?.(s)}
            {/* nameplate */}
            <g transform={`translate(${s.x + 12 * scale}, ${s.y + 44 * scale})`}>
              <rect x="-6" y="-3" width={a.windowNo ? 132 : 118} height="18" rx="3" fill={P.plate} stroke={P.plateEdge} strokeWidth="0.8" opacity="0.95" />
              <text x="4" y="10" fontSize="11" fill={P.ink} fontWeight="600" fontFamily="inherit">
                {a.windowNo ? `${a.windowNo} · ` : ""}
                {a.dept}
              </text>
            </g>
            <text x={s.x + 8 * scale} y={s.y + 74 * scale} fontSize="10" fill={P.faint}>
              {a.personName}
              {a.status ? " · probation" : ""}
            </text>
            {/* status pill */}
            {busy && st && (
              <g transform={`translate(${center.x}, ${s.y - 62 * scale})`}>
                <rect x="-56" y="-11" width="112" height="20" rx="10" fill={P.ink} opacity="0.92" />
                <text x="0" y="3.5" textAnchor="middle" fontSize="10.5" fill="#fdfaf2">
                  {st.state === "consulting" && st.target
                    ? `memo → ${AGENT_MAP[st.target].personName.split(" ")[0]}`
                    : STATE_TEXT[st.state]}
                </text>
              </g>
            )}
            {suggested === a.id && current !== a.id && !observer && (
              <g transform={`translate(${center.x}, ${s.y - 54})`}>
                <path d="M-7 -8 L0 0 L7 -8" stroke={P.clay} strokeWidth="3" fill="none" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="translate" values="0 0; 0 7; 0 0" dur="0.9s" repeatCount="indefinite" />
                </path>
              </g>
            )}
            {/* queue */}
            {isWindow && queueSize > 0 && (
              <g>
                <Stanchions x={s.x + 30} y={s.y + 92} />
                {Array.from({ length: queueSize }).map((_, qi) => (
                  <Person
                    key={qi}
                    x={s.x + 52 + qi * 26}
                    y={s.y + 96 + qi * 12}
                    color={P.visitorGray}
                    scale={0.78}
                  />
                ))}
              </g>
            )}
          </g>
        );
      })}

      {/* staff-only plaque on mezzanine face */}
      <g transform="translate(700, 208) rotate(26.5)">
        <rect x="-46" y="-9" width="92" height="17" rx="2" fill={P.plate} stroke={P.plateEdge} />
        <text x="0" y="3.5" textAnchor="middle" fontSize="9.5" fill={P.faint} letterSpacing="2">
          {staffOnly}
        </text>
      </g>

      {/* entrance */}
      <g>
        <polygon points={`${ISO_ENTRANCE.x},${ISO_ENTRANCE.y - 16} ${ISO_ENTRANCE.x + 74},${ISO_ENTRANCE.y + 21} ${ISO_ENTRANCE.x},${ISO_ENTRANCE.y + 58} ${ISO_ENTRANCE.x - 74},${ISO_ENTRANCE.y + 21}`} fill={P.mezzFace} />
        <polygon points={`${ISO_ENTRANCE.x},${ISO_ENTRANCE.y - 8} ${ISO_ENTRANCE.x + 58},${ISO_ENTRANCE.y + 21} ${ISO_ENTRANCE.x},${ISO_ENTRANCE.y + 50} ${ISO_ENTRANCE.x - 58},${ISO_ENTRANCE.y + 21}`} fill={P.clay} opacity="0.45" />
        <text x={ISO_ENTRANCE.x} y={ISO_ENTRANCE.y + 26} textAnchor="middle" fontSize="10" letterSpacing="3" fill="#fdfaf2" fontWeight="600">
          ENTRANCE
        </text>
      </g>
    </svg>
  );
}
