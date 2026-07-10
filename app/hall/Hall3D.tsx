"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AGENT_MAP, AGENTS } from "@/lib/agents";
import { loadExperience } from "@/lib/experience";
import type { AgentId, AgentUiState } from "@/lib/types";

// The hall as an exploded hierarchy: glass rooms suspended in a dark void,
// altitude = standing (seniority-staggered, not rank-quantized), memos travel
// as particle streams between boxes, the citizen stays on the ground and
// reaches a window only through a beam of light. Layout frozen from the
// approved proposal (v9) — coordinates are design constants, not derived.

type Channel = "peer" | "up" | "down";

export type HallFlight = {
  id: number;
  from: AgentId;
  to: AgentId;
  reply: boolean;
  channel?: Channel;
};

type Props = {
  current: AgentId | null;
  suggested: AgentId | null;
  synthetic: boolean;
  statusMap: Partial<Record<AgentId, { state: AgentUiState; target?: AgentId }>>;
  queueSize: number;
  memoRoutes: { from: AgentId; to: AgentId; n: number; channel: Channel }[];
  trail: { a: AgentId | "entrance"; b: AgentId | "entrance"; n: number }[];
  flights: HallFlight[];
  onFlightDone: (id: number) => void;
  docCount: number;
  todoCount: number;
  beamFlow: "up" | "down" | null;
  closed: boolean;
  conditionId: string | null;
  onSelect: (id: AgentId) => void;
};

type Room = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  c: number;
  num: string;
  big?: boolean;
  wood?: boolean;
  papers?: number;
};

const ROOMS: Record<AgentId, Room> = {
  daoban: { x: -5.8, y: 4.8, z: 2.8, w: 2.6, h: 1.6, d: 1.7, c: 0xf4c14b, num: "01" },
  shouli: { x: 6.1, y: 3.85, z: 1.4, w: 1.9, h: 1.6, d: 2.6, c: 0xe8484f, num: "02" },
  cailiao: { x: 3.8, y: 5.55, z: 3.4, w: 2.7, h: 1.8, d: 1.8, c: 0xe46fa4, num: "03" },
  zige: { x: -3.4, y: 2.7, z: 1.2, w: 1.5, h: 1.4, d: 2.0, c: 0x9d6fd4, num: "04" },
  dangan: { x: -4.2, y: 7.05, z: -2.6, w: 3.3, h: 2.0, d: 2.1, c: 0x45c4b8, num: "05", papers: 3 },
  quanxian: { x: 0.8, y: 6.15, z: -3.8, w: 2.1, h: 1.5, d: 2.9, c: 0x4d82d8, num: "06", papers: 2 },
  fengkong: { x: -1.8, y: 4.35, z: -2.0, w: 2.4, h: 1.6, d: 1.7, c: 0x6fbf5e, num: "07" },
  fuhe: { x: 2.4, y: 3.45, z: -3.2, w: 1.7, h: 1.5, d: 2.3, c: 0x8792a3, num: "08" },
  chief_front: { x: -1.2, y: 8.55, z: 0.8, w: 2.9, h: 1.9, d: 2.1, c: 0xf5a43a, num: "CHIEF · FRONT", big: true, wood: true },
  chief_back: { x: 4.6, y: 7.8, z: -1.2, w: 2.2, h: 1.8, d: 2.7, c: 0x7aade0, num: "CHIEF · BACK", big: true, wood: true },
  director: { x: 2.2, y: 12.6, z: -0.6, w: 3.8, h: 2.3, d: 2.6, c: 0xaebacd, num: "DIRECTOR", big: true, wood: true },
  trainee_front: { x: -6.8, y: 0.9, z: 1.8, w: 1.15, h: 1.05, d: 1.35, c: 0xf8cd90, num: "TRAINEE" },
  trainee_back: { x: 5.6, y: 1.5, z: -2.6, w: 1.5, h: 1.1, d: 1.2, c: 0xb9d4f0, num: "TRAINEE" },
};

const ENTRANCE_SPOT = new THREE.Vector3(0, 0, 7.4);
const CHANNEL_COLOR: Record<Channel, number> = { peer: 0xa8cf90, up: 0xf0847e, down: 0x9fbce8 };
const STATE_TEXT: Record<AgentUiState, string> = {
  receiving: "ATTENDING",
  consulting: "MEMO OUT",
  replying: "DRAFTING",
  idle: "",
};

// Standing accrues: altitude drifts upward with accumulated service
// (experience tallies), on top of the frozen design coordinates.
const DRIFT: Partial<Record<AgentId, number>> = {};

function driftY(id: AgentId): number {
  return DRIFT[id] ?? 0;
}

function computeDrift() {
  try {
    const exp = loadExperience();
    (Object.keys(ROOMS) as AgentId[]).forEach((id) => {
      const tl = exp.tallies[id];
      if (!tl) {
        delete DRIFT[id];
        return;
      }
      const d = Math.min(
        0.5,
        tl.cases * 0.05 + (tl.memosIn + tl.memosOut) * 0.008 + tl.docs * 0.02
      );
      if (d > 0.004) DRIFT[id] = d;
      else delete DRIFT[id];
    });
  } catch {
    // localStorage unavailable: keep frozen altitudes
  }
}

function groundSpot(id: AgentId | "entrance"): THREE.Vector3 {
  if (id === "entrance") return ENTRANCE_SPOT.clone();
  const r = ROOMS[id];
  return new THREE.Vector3(r.x, 0, r.z + r.d / 2 + 1.1);
}

function boxBottom(id: AgentId): THREE.Vector3 {
  const r = ROOMS[id];
  return new THREE.Vector3(r.x, r.y + driftY(id) - r.h / 2, r.z);
}

function boxTop(id: AgentId): THREE.Vector3 {
  const r = ROOMS[id];
  return new THREE.Vector3(r.x, r.y + driftY(id) + r.h / 2, r.z);
}

function muted(c: number, t: number): THREE.Color {
  return new THREE.Color(c).lerp(new THREE.Color(0xa7afbc), t);
}

type TextSprite = { sprite: THREE.Sprite; set: (txt: string) => void };

// Bare letterspaced glow text — the same voice as the floor-axis labels.
// No boxes: labels belong to the drawing, not to the UI.
const SANS = "-apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "Menlo, 'SF Mono', Consolas, 'Roboto Mono', monospace";

function textSprite(
  txt: string,
  scale: number,
  color?: string,
  fontPx = 40,
  weight = 500,
  tight = false,
  family = SANS
): TextSprite {
  const cv = document.createElement("canvas");
  cv.width = 640;
  cv.height = Math.max(110, Math.round(fontPx * 2.1));
  const ch = cv.height;
  const ctx = cv.getContext("2d")! as CanvasRenderingContext2D & { letterSpacing?: string };
  const tex = new THREE.CanvasTexture(cv);
  const draw = (text: string) => {
    const shown = tight ? text : text.split("").join(" ");
    ctx.clearRect(0, 0, 640, ch);
    let px = fontPx;
    ctx.font = `${weight} ${px}px ${family}`;
    ctx.letterSpacing = tight ? `${Math.round(px * 0.05)}px` : "0px";
    const w0 = ctx.measureText(shown).width;
    if (w0 > 616) {
      px = Math.max(18, Math.floor((fontPx * 616) / w0));
      ctx.font = `${weight} ${px}px ${family}`;
      ctx.letterSpacing = tight ? `${Math.round(px * 0.05)}px` : "0px";
    }
    ctx.fillStyle = color ?? "rgba(232,240,250,.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(6,8,12,.95)";
    ctx.shadowBlur = Math.max(6, px * 0.16);
    ctx.fillText(shown, 320, ch / 2 + px * 0.04);
    ctx.shadowBlur = 0;
    tex.needsUpdate = true;
  };
  draw(txt);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true })
  );
  sprite.scale.set(scale, (scale * ch) / 640, 1);
  return { sprite, set: draw };
}

type Stream = {
  curve: THREE.QuadraticBezierCurve3;
  pos: Float32Array;
  ph: Float32Array;
  n: number;
  geo: THREE.BufferGeometry;
  obj: THREE.Points;
};

function makeStream(
  parent: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  color: number,
  n: number,
  lift: number
): Stream {
  const mid = new THREE.Vector3((a.x + b.x) / 2, Math.max(a.y, b.y) + lift, (a.z + b.z) / 2);
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const pos = new Float32Array(n * 3);
  const ph = new Float32Array(n);
  for (let j = 0; j < n; j++) ph[j] = Math.random();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const obj = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color,
      size: 0.16,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  parent.add(obj);
  return { curve, pos, ph, n, geo, obj };
}

type RoomRef = {
  group: THREE.Group;
  floor: THREE.MeshStandardMaterial;
  status: TextSprite;
  fig: THREE.Group;
  figWorld: THREE.Vector3;
};

type Trip = {
  id: number;
  out: THREE.QuadraticBezierCurve3;
  back: THREE.QuadraticBezierCurve3;
  g: THREE.Group;
  t: number;
  phase: 0 | 1 | 2;
  fig: THREE.Group;
};

type World = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  clock: THREE.Clock;
  cam: { az: number; pol: number; dist: number; target: THREE.Vector3; auto: boolean };
  rooms: Map<AgentId, RoomRef>;
  me: THREE.Group;
  meMats: THREE.MeshStandardMaterial[];
  stack: THREE.Group;
  beam: THREE.Mesh;
  beamMat: THREE.MeshBasicMaterial;
  suggestPin: THREE.Group;
  queue: THREE.Group;
  streamsGroup: THREE.Group;
  streams: Stream[];
  trailGroup: THREE.Group;
  pulses: { id: number; curve: THREE.QuadraticBezierCurve3; mesh: THREE.Mesh; t: number }[];
  papers: { mesh: THREE.Mesh; t: number; from: THREE.Vector3; ghost?: boolean }[];
  trips: Trip[];
  mkFig: (c: number, sc: number) => THREE.Group;
  closedT: number;
  amb: THREE.AmbientLight;
  dl: THREE.DirectionalLight;
  baseGlow: number;
  dustBoost: number;
  dusts: { pos: Float32Array; n: number; speed: number; top: number; geo: THREE.BufferGeometry }[];
  colGeo: THREE.BufferGeometry;
  colPos: Float32Array;
  colN: number;
  plants: THREE.Points[];
  floats: { g: THREE.Group; y: number; ph: number }[];
  stackShown: number;
  rebuildStack: () => void;
  raf: number;
};

export default function Hall3D(props: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const spawned = useRef(new Set<number>());
  const prevDocs = useRef(-1);
  const prevTodos = useRef(-1);
  const [autoLabel, setAutoLabel] = useState(false);
  const [researcher, setResearcher] = useState(false);
  const researcherRef = useRef(false);
  const [dossier, setDossier] = useState<AgentId | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    wrap.appendChild(renderer.domElement);

    computeDrift();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070a);
    scene.fog = new THREE.FogExp2(0x06070a, 0.006);
    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 400);
    const cam = { az: 0.55, pol: 1.12, dist: 30, target: new THREE.Vector3(0, 5.8, 0), auto: false };

    const amb = new THREE.AmbientLight(0x9fb2d6, 0.32);
    scene.add(amb);
    const dl = new THREE.DirectionalLight(0xdfe8ff, 0.28);
    dl.position.set(10, 26, 8);
    scene.add(dl);

    scene.add(new THREE.GridHelper(40, 40, 0x2a3345, 0x141a26));
    const wall1 = new THREE.GridHelper(36, 36, 0x212a3b, 0x10151f);
    wall1.rotation.x = Math.PI / 2;
    wall1.position.set(0, 18, -12);
    scene.add(wall1);
    const wall2 = new THREE.GridHelper(36, 36, 0x212a3b, 0x10151f);
    wall2.rotation.z = Math.PI / 2;
    wall2.rotation.y = Math.PI / 2;
    wall2.position.set(-13, 18, 0);
    scene.add(wall2);

    const arcPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (Math.PI * i) / 48;
      arcPts.push(new THREE.Vector3(Math.cos(a) * 14.5, Math.sin(a) * 14.5, -11.9));
    }
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(arcPts),
        new THREE.LineBasicMaterial({ color: 0x39445c, transparent: true, opacity: 0.7 })
      )
    );

    const line = (a: THREE.Vector3, b: THREE.Vector3, color: number, opacity: number) => {
      scene.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([a, b]),
          new THREE.LineBasicMaterial({ color, transparent: true, opacity })
        )
      );
    };

    for (const a of AGENTS) {
      if (!a.superior) continue;
      line(boxTop(a.id), boxBottom(a.superior), 0x8fa2c0, 0.15);
    }

    line(new THREE.Vector3(-9.6, 0, 0), new THREE.Vector3(-9.6, 13.4, 0), 0x55617a, 0.8);
    for (let i = 0; i <= 4; i++) {
      const fy = i * 3;
      line(new THREE.Vector3(-9.95, fy, 0), new THREE.Vector3(-9.25, fy, 0), 0x55617a, 0.9);
      const lb = textSprite(i === 0 ? "G" : i + "F", 1.1);
      lb.sprite.position.set(-10.6, fy, 0);
      scene.add(lb.sprite);
    }
    (
      [
        [1.2, "TRAINEES"],
        [4.9, "WINDOWS"],
        [8.2, "SECTION CHIEFS"],
        [12.6, "DIRECTOR"],
      ] as [number, string][]
    ).forEach(([y, txt]) => {
      const lb = textSprite(txt, 2.9);
      lb.sprite.position.set(-9.6, y + 0.55, 0);
      scene.add(lb.sprite);
    });
    (
      [
        [7.05, "AD 2.35F", "rgba(122,222,205,.95)", 0x45c4b8],
        [2.7, "TN 0.9F", "rgba(190,160,240,.95)", 0x9d6fd4],
      ] as [number, string, string, number][]
    ).forEach(([y, txt, css, col]) => {
      line(new THREE.Vector3(-9.85, y, 0), new THREE.Vector3(-9.35, y, 0), col, 0.95);
      const lb = textSprite(txt, 1.6, css, 40, 600);
      lb.sprite.position.set(-8.2, y, 0);
      scene.add(lb.sprite);
    });

    const fig = (c: number, sc: number) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.2, 0.42, 16),
        new THREE.MeshStandardMaterial({ color: 0x2c313b, emissive: 0x2c313b, emissiveIntensity: 0.15, roughness: 0.85 })
      );
      body.position.y = 0.36;
      g.add(body);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.02, 8, 20),
        new THREE.MeshStandardMaterial({ color: muted(c, 0.22), emissive: muted(c, 0.22), emissiveIntensity: 0.7, roughness: 0.6 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.5;
      g.add(ring);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xd9d3c7, emissive: 0xd9d3c7, emissiveIntensity: 0.22, roughness: 0.8 })
      );
      head.position.y = 0.7;
      g.add(head);
      g.scale.set(sc, sc, sc);
      return g;
    };

    const rooms = new Map<AgentId, RoomRef>();
    const pickables: THREE.Object3D[] = [];

    (Object.keys(ROOMS) as AgentId[]).forEach((id) => {
      const o = ROOMS[id];
      const g = new THREE.Group();
      const wash = muted(o.c, 0.58);
      const accent = muted(o.c, 0.22);
      g.add(
        new THREE.Mesh(
          new THREE.BoxGeometry(o.w, o.h, o.d),
          new THREE.MeshStandardMaterial({ color: 0x9fb4cc, transparent: true, opacity: 0.055, roughness: 0.25 })
        )
      );
      g.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(o.w, o.h, o.d)),
          new THREE.LineBasicMaterial({ color: 0xe6ecf8, transparent: true, opacity: 0.8 })
        )
      );
      const floorMat = new THREE.MeshStandardMaterial({ color: wash, emissive: wash, emissiveIntensity: 0.34, roughness: 1 });
      const fl = new THREE.Mesh(new THREE.BoxGeometry(o.w - 0.08, 0.06, o.d - 0.08), floorMat);
      fl.position.y = -o.h / 2 + 0.05;
      g.add(fl);
      const lw = o.w > o.d;
      const dw = lw ? o.w * 0.36 : o.w * 0.3;
      const dd = lw ? o.d * 0.3 : o.d * 0.36;
      const dx = lw ? o.w * 0.12 : 0;
      const dz = lw ? 0 : o.d * 0.12;
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(dw * 0.82, 0.16, dd * 0.78),
        new THREE.MeshStandardMaterial({ color: 0x39404d, roughness: 0.9 })
      );
      base.position.set(dx, -o.h / 2 + 0.16, dz);
      g.add(base);
      const topc = o.wood ? 0xa98d66 : 0xe9ebee;
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(dw, 0.05, dd),
        new THREE.MeshStandardMaterial({ color: topc, emissive: topc, emissiveIntensity: o.wood ? 0.1 : 0.16, roughness: 0.7 })
      );
      top.position.set(dx, -o.h / 2 + 0.265, dz);
      g.add(top);
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(lw ? dw : 0.02, 0.015, lw ? 0.02 : dd),
        new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6 })
      );
      strip.position.set(dx + (lw ? 0 : dw / 2), -o.h / 2 + 0.285, dz + (lw ? dd / 2 : 0));
      g.add(strip);
      const pap = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.05, 0.26),
        new THREE.MeshStandardMaterial({ color: 0xf2f4f6, emissive: 0xf2f4f6, emissiveIntensity: 0.32 })
      );
      pap.position.set(dx + 0.1, -o.h / 2 + 0.32, dz);
      g.add(pap);
      if ((o.papers ?? 1) > 1) {
        const sw = lw ? o.w * 0.5 : 0.24;
        const sd = lw ? 0.24 : o.d * 0.5;
        const shelf = new THREE.Mesh(
          new THREE.BoxGeometry(sw, 0.03, sd),
          new THREE.MeshStandardMaterial({ color: 0xe9ebee, emissive: 0xe9ebee, emissiveIntensity: 0.14, roughness: 0.8 })
        );
        shelf.position.set(lw ? -o.w * 0.14 : -o.w / 2 + 0.16, -o.h / 2 + 0.74, lw ? -o.d / 2 + 0.16 : -o.d * 0.14);
        g.add(shelf);
        for (let k = 0; k < (o.papers ?? 1) - 1; k++) {
          const bl = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.11, 0.12),
            new THREE.MeshStandardMaterial({ color: 0xf2f4f6, emissive: 0xf2f4f6, emissiveIntensity: 0.3 })
          );
          bl.position.set(
            shelf.position.x + (lw ? (k - 0.5) * 0.34 : 0),
            -o.h / 2 + 0.81,
            shelf.position.z + (lw ? 0 : (k - 0.5) * 0.34)
          );
          g.add(bl);
        }
      }
      const f = fig(o.c, Math.min(1, o.h / 1.7));
      f.position.set(lw ? -o.w * 0.16 : -o.w * 0.1, -o.h / 2 + 0.06, lw ? -o.d * 0.1 : -o.d * 0.18);
      g.add(f);
      const short = o.num.length <= 2;
      const np = textSprite(
        o.num,
        o.big ? 3.2 : short ? 2.4 : 1.8,
        "rgba(236,243,252,.96)",
        o.big ? 52 : short ? 120 : 54,
        short && !o.big ? 600 : 400,
        short && !o.big,
        short && !o.big ? MONO : SANS
      );
      np.sprite.position.y = o.h / 2 + (short ? 0.55 : 0.45);
      g.add(np.sprite);
      const status = textSprite("", o.big ? 2.6 : 2.3, "#" + accent.getHexString(), 44, 500);
      status.sprite.position.y = o.h / 2 + (short ? 1.42 : 1.28);
      status.sprite.visible = false;
      g.add(status.sprite);
      g.position.set(o.x, o.y + driftY(id), o.z);
      g.traverse((m) => {
        m.userData.key = id;
      });
      scene.add(g);
      pickables.push(g);
      rooms.set(id, {
        group: g,
        floor: floorMat,
        status,
        fig: f,
        figWorld: new THREE.Vector3(
          o.x + f.position.x,
          o.y + driftY(id) + f.position.y,
          o.z + f.position.z
        ),
      });
    });

    const plants: THREE.Points[] = [];
    const floats: { g: THREE.Group; y: number; ph: number }[] = [];
    const mkPts = (arr: number[], color: number, size: number, op: number, parent?: THREE.Object3D) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(arr), 3));
      const p = new THREE.Points(
        geo,
        new THREE.PointsMaterial({ color, size, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      (parent ?? scene).add(p);
      return p;
    };
    const cylArr = (arr: number[], r: number, y0: number, h: number, n: number) => {
      for (let j = 0; j < n; j++) {
        const a = Math.random() * 6.283;
        arr.push(Math.cos(a) * r, y0 + Math.random() * h, Math.sin(a) * r);
      }
    };
    const sphArr = (arr: number[], cx: number, cy: number, cz: number, r: number, n: number, sq: number) => {
      for (let j = 0; j < n; j++) {
        const u = Math.random() * 6.283;
        const v = Math.acos(2 * Math.random() - 1);
        const rj = r * (0.82 + Math.random() * 0.3);
        arr.push(cx + rj * Math.sin(v) * Math.cos(u), cy + rj * Math.cos(v) * sq, cz + rj * Math.sin(v) * Math.sin(u));
      }
    };
    const boxCloud = (arr: number[], cx: number, cy: number, cz: number, w: number, h: number, d: number, n: number) => {
      for (let j = 0; j < n; j++) {
        const f = Math.floor(Math.random() * 6);
        const u = Math.random() - 0.5;
        const v = Math.random() - 0.5;
        let x = 0,
          y = 0,
          z = 0;
        if (f < 2) {
          x = ((f ? 1 : -1) * w) / 2;
          y = v * h;
          z = u * d;
        } else if (f < 4) {
          y = ((f === 2 ? 1 : -1) * h) / 2;
          x = u * w;
          z = v * d;
        } else {
          z = ((f === 4 ? 1 : -1) * d) / 2;
          x = u * w;
          y = v * h;
        }
        arr.push(cx + x, cy + y + h / 2, cz + z);
      }
    };
    const palm = () => {
      const arr: number[] = [];
      cylArr(arr, 0.26, 0, 0.34, 70);
      for (let j = 0; j < 16; j++) arr.push((Math.random() - 0.5) * 0.09, 0.34 + Math.random() * 0.42, (Math.random() - 0.5) * 0.09);
      for (let L = 0; L < 6; L++) {
        const th = L * 1.047 + Math.random() * 0.4;
        const len = 0.85 + Math.random() * 0.35;
        for (let s = 0; s < 38; s++) {
          const u = s / 38;
          arr.push(
            Math.cos(th) * u * len + (Math.random() - 0.5) * 0.06,
            0.76 + 0.5 * u - 0.92 * u * u + (Math.random() - 0.5) * 0.05,
            Math.sin(th) * u * len + (Math.random() - 0.5) * 0.06
          );
        }
      }
      return arr;
    };
    const bushArr = () => {
      const arr: number[] = [];
      cylArr(arr, 0.24, 0, 0.3, 60);
      sphArr(arr, 0, 0.85, 0, 0.52, 290, 0.85);
      return arr;
    };
    const saplingArr = () => {
      const arr: number[] = [];
      cylArr(arr, 0.18, 0, 0.26, 45);
      for (let j = 0; j < 14; j++) arr.push((Math.random() - 0.5) * 0.06, 0.26 + Math.random() * 0.7, (Math.random() - 0.5) * 0.06);
      sphArr(arr, 0, 1.12, 0, 0.3, 130, 1);
      return arr;
    };
    const stoolArr = () => {
      const arr: number[] = [];
      cylArr(arr, 0.2, 0, 0.46, 55);
      for (let j = 0; j < 30; j++) {
        const rr = Math.sqrt(Math.random()) * 0.24;
        const aa = Math.random() * 6.283;
        arr.push(Math.cos(aa) * rr, 0.48, Math.sin(aa) * rr);
      }
      return arr;
    };
    const plantAt = (arr: number[], x: number, z: number, col: number, parent?: THREE.Object3D) => {
      const p = mkPts(arr, col, 0.055, 0.8, parent);
      if (!parent) p.position.set(x, 0, z);
      p.userData.ph = Math.random() * 6;
      plants.push(p);
    };
    const island = (x: number, y: number, z: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      scene.add(g);
      const disc: number[] = [];
      for (let j = 0; j < 60; j++) {
        const rd = 0.42 + Math.random() * 0.14;
        const ad = Math.random() * 6.283;
        disc.push(Math.cos(ad) * rd, 0.01, Math.sin(ad) * rd);
      }
      mkPts(disc, 0x8fa2c0, 0.05, 0.5, g);
      floats.push({ g, y, ph: Math.random() * 6 });
      return g;
    };
    plantAt(palm(), 3.2, 3.9, 0xeaa2c0);
    plantAt(bushArr(), 4.7, 3.0, 0xe08cb2);
    const rugArr: number[] = [];
    for (let j = 0; j < 300; j++) {
      const rr = Math.sqrt(Math.random()) * 1.35;
      const aa = Math.random() * 6.283;
      const band = rr > 0.85 && rr < 1.05 ? Math.random() < 0.5 : true;
      if (band) rugArr.push(3.8 + Math.cos(aa) * rr, 0.02 + Math.random() * 0.02, 3.6 + Math.sin(aa) * rr);
    }
    mkPts(rugArr, 0xc99ab0, 0.05, 0.65);
    mkPts(stoolArr(), 0xb0b8cc, 0.05, 0.75).position.set(2.7, 0, 4.4);
    const coolArr: number[] = [];
    boxCloud(coolArr, -5.2, 0, -2.2, 0.46, 1.2, 0.46, 210);
    sphArr(coolArr, -5.2, 1.42, -2.2, 0.2, 70, 1);
    mkPts(coolArr, 0x9fc0dc, 0.055, 0.8);
    const prnArr: number[] = [];
    boxCloud(prnArr, -4.6, 0, 3.2, 0.95, 0.5, 0.62, 230);
    mkPts(prnArr, 0x9aa8c4, 0.055, 0.75);
    const trayArr: number[] = [];
    for (let j = 0; j < 55; j++) trayArr.push(-4.6 + (Math.random() - 0.5) * 0.5, 0.56 + Math.random() * 0.03, 3.2 + (Math.random() - 0.5) * 0.34);
    mkPts(trayArr, 0xe8ecf4, 0.05, 0.85);
    mkPts(stoolArr(), 0xb0b8cc, 0.05, 0.75).position.set(-4.0, 0, -1.2);
    const i1 = island(-3.9, 5.3, -0.2);
    plantAt(bushArr(), 0, 0, 0xe08cb2, i1);
    const i2 = island(1.7, 7.25, -2.3);
    plantAt(saplingArr(), 0, 0, 0xeaa2c0, i2);
    const i4 = island(5.3, 4.9, -0.6);
    mkPts(stoolArr(), 0xb0b8cc, 0.05, 0.75, i4);
    const i3 = island(0.6, 10.35, 0.3);
    const archArr: number[] = [];
    boxCloud(archArr, 0, 0.04, 0, 0.5, 0.36, 0.42, 130);
    mkPts(archArr, 0xe8ecf4, 0.05, 0.85, i3);
    const looseArr: number[] = [];
    for (let j = 0; j < 26; j++) looseArr.push((Math.random() - 0.5) * 1.3, 0.1 + Math.random() * 0.9, (Math.random() - 0.5) * 1.1);
    mkPts(looseArr, 0xdfe6f2, 0.045, 0.6, i3);

    const mkDust = (n: number, spread: [number, number, number], sz: number, op: number, speed: number) => {
      const pos = new Float32Array(n * 3);
      for (let j = 0; j < n; j++) {
        pos[j * 3] = (Math.random() - 0.5) * spread[0];
        pos[j * 3 + 1] = Math.random() * spread[1];
        pos[j * 3 + 2] = (Math.random() - 0.5) * spread[2];
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      scene.add(
        new THREE.Points(
          geo,
          new THREE.PointsMaterial({ color: 0x7d8ca6, size: sz, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })
        )
      );
      return { pos, n, speed, top: spread[1], geo };
    };
    const dusts = [mkDust(1000, [22, 16, 14], 0.07, 0.5, 0.13), mkDust(240, [22, 16, 14], 0.12, 0.28, 0.08)];
    const colN = 420;
    const colPos = new Float32Array(colN * 3);
    for (let j = 0; j < colN; j++) {
      const rr = Math.random() * 0.9;
      const aa = Math.random() * 6.283;
      colPos[j * 3] = 2.2 + Math.cos(aa) * rr;
      colPos[j * 3 + 1] = Math.random() * 12.2;
      colPos[j * 3 + 2] = -0.6 + Math.sin(aa) * rr;
    }
    const colGeo = new THREE.BufferGeometry();
    colGeo.setAttribute("position", new THREE.BufferAttribute(colPos, 3));
    scene.add(
      new THREE.Points(
        colGeo,
        new THREE.PointsMaterial({ color: 0x93a4c4, size: 0.085, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
      )
    );

    const me = new THREE.Group();
    const meMats: THREE.MeshStandardMaterial[] = [];
    const mkMe = (geo: THREE.BufferGeometry, y: number) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xe8484f, emissive: 0xe8484f, emissiveIntensity: 0.55 });
      meMats.push(mat);
      const m = new THREE.Mesh(geo, mat);
      m.position.y = y;
      me.add(m);
    };
    mkMe(new THREE.CylinderGeometry(0.02, 0.2, 0.5, 14), 0.25);
    mkMe(new THREE.SphereGeometry(0.17, 16, 12), 0.62);
    const mring = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.025, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })
    );
    mring.rotation.x = Math.PI / 2;
    mring.position.y = 0.62;
    me.add(mring);
    me.position.copy(ENTRANCE_SPOT);
    scene.add(me);
    const stack = new THREE.Group();
    me.add(stack);

    const beamMat = new THREE.MeshBasicMaterial({ color: 0xf0847e, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.16, 1, 10, 1, true), beamMat);
    beam.visible = false;
    scene.add(beam);

    // words rise, replies fall: particles inside the beam
    const flowN = 42;
    const flowPos = new Float32Array(flowN * 3);
    const flowPh = new Float32Array(flowN);
    const flowOff = new Float32Array(flowN * 2);
    for (let j = 0; j < flowN; j++) {
      flowPh[j] = Math.random();
      const a = Math.random() * 6.283;
      const r = Math.random() * 0.09;
      flowOff[j * 2] = Math.cos(a) * r;
      flowOff[j * 2 + 1] = Math.sin(a) * r;
    }
    const flowGeo = new THREE.BufferGeometry();
    flowGeo.setAttribute("position", new THREE.BufferAttribute(flowPos, 3));
    const flowMat = new THREE.PointsMaterial({ color: 0xffd9d4, size: 0.11, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const flowPts = new THREE.Points(flowGeo, flowMat);
    flowPts.visible = false;
    scene.add(flowPts);

    const suggestPin = new THREE.Group();
    const spCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.18, 0.44, 12),
      new THREE.MeshStandardMaterial({ color: 0xf0847e, emissive: 0xf0847e, emissiveIntensity: 0.7 })
    );
    spCone.position.y = 0.22;
    suggestPin.add(spCone);
    const spBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })
    );
    spBall.position.y = 0.56;
    suggestPin.add(spBall);
    suggestPin.visible = false;
    scene.add(suggestPin);

    const queue = new THREE.Group();
    scene.add(queue);
    const streamsGroup = new THREE.Group();
    scene.add(streamsGroup);
    const trailGroup = new THREE.Group();
    scene.add(trailGroup);

    const world: World = {
      renderer,
      scene,
      camera,
      clock: new THREE.Clock(),
      cam,
      rooms,
      me,
      meMats,
      stack,
      beam,
      beamMat,
      suggestPin,
      queue,
      streamsGroup,
      streams: [],
      trailGroup,
      pulses: [],
      papers: [],
      trips: [],
      mkFig: fig,
      closedT: 0,
      amb,
      dl,
      baseGlow: 0.34,
      dustBoost: 1,
      dusts,
      colGeo,
      colPos,
      colN,
      plants,
      floats,
      stackShown: -1,
      rebuildStack: () => {
        while (stack.children.length) stack.remove(stack.children[0]);
        for (let k = 0; k < Math.min(world.stackShown, 6); k++) {
          const s = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.035, 0.4),
            new THREE.MeshStandardMaterial({ color: 0xf2f4f6, emissive: 0xf2f4f6, emissiveIntensity: 0.35 })
          );
          s.position.set(0.42, 0.02 + k * 0.042, 0.25);
          s.rotation.y = (k % 2) * 0.3 - 0.15;
          stack.add(s);
        }
      },
      raf: 0,
    };
    worldRef.current = world;

    const resize = () => {
      const w = wrap.clientWidth || 800;
      const h = wrap.clientHeight || Math.round(w * 0.53);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let down = false,
      moved = false,
      px = 0,
      py = 0,
      az0 = 0,
      pol0 = 0;
    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      down = true;
      moved = false;
      px = e.clientX;
      py = e.clientY;
      az0 = cam.az;
      pol0 = cam.pol;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - px,
        dy = e.clientY - py;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      cam.az = az0 - dx * 0.005;
      cam.pol = Math.min(1.42, Math.max(0.3, pol0 - dy * 0.005));
    };
    const onUp = (e: PointerEvent) => {
      if (down && !moved) {
        const r = el.getBoundingClientRect();
        const nd = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(nd, camera);
        const hit = ray.intersectObjects(pickables, true);
        if (hit.length) {
          let o: THREE.Object3D | null = hit[0].object;
          let key: AgentId | undefined;
          while (o && !key) {
            key = o.userData.key as AgentId | undefined;
            o = o.parent;
          }
          if (key) {
            if (researcherRef.current) {
              setDossier(key);
            } else if (AGENT_MAP[key].level === 3 && !propsRef.current.synthetic) {
              propsRef.current.onSelect(key);
            }
          }
        }
      }
      down = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.dist = Math.min(58, Math.max(11, cam.dist * Math.pow(1.0016, e.deltaY)));
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    const yAxis = new THREE.Vector3(0, 1, 0);
    const animate = () => {
      world.raf = requestAnimationFrame(animate);
      const dt = Math.min(world.clock.getDelta(), 0.05);
      const t = world.clock.elapsedTime;
      const p = propsRef.current;

      if (cam.auto) cam.az += dt * 0.1;

      const goal = p.current ? groundSpot(p.current) : ENTRANCE_SPOT.clone();
      const dvec = new THREE.Vector3().subVectors(goal, me.position);
      dvec.y = 0;
      const dl2 = dvec.length();
      if (dl2 > 0.08) {
        me.position.addScaledVector(dvec.normalize(), Math.min(dl2, 3.4 * dt));
        me.position.y = Math.abs(Math.sin(t * 10)) * 0.05;
      } else {
        me.position.y = 0;
      }
      const meCol = p.synthetic ? 0xf0955f : 0xe8484f;
      meMats.forEach((m) => {
        m.color.setHex(meCol);
        m.emissive.setHex(meCol);
      });

      if (p.current) {
        const top = new THREE.Vector3(me.position.x, me.position.y + 0.7, me.position.z);
        const bot = boxBottom(p.current);
        const bd = new THREE.Vector3().subVectors(bot, top);
        const bl = bd.length();
        beam.position.copy(new THREE.Vector3().addVectors(top, bot).multiplyScalar(0.5));
        beam.scale.set(1, bl, 1);
        beam.quaternion.setFromUnitVectors(yAxis, bd.clone().normalize());
        if (p.closed) {
          world.closedT += dt;
          beamMat.color.setHex(0x6ed6af);
          beamMat.opacity = Math.max(0, 0.32 - world.closedT * 0.09);
        } else {
          world.closedT = 0;
          beamMat.color.setHex(0xf0847e);
          beamMat.opacity = 0.2 + 0.12 * Math.sin(t * 2.6);
        }
        beam.visible = beamMat.opacity > 0.01;
        if (p.beamFlow && !p.closed) {
          flowPts.visible = true;
          flowMat.color.setHex(p.beamFlow === "up" ? 0xffd9d4 : 0xcfe2ff);
          for (let j = 0; j < flowN; j++) {
            const raw = p.beamFlow === "up" ? t * 0.5 + flowPh[j] : -t * 0.5 + flowPh[j];
            const u = ((raw % 1) + 1) % 1;
            flowPos[j * 3] = top.x + bd.x * u + flowOff[j * 2];
            flowPos[j * 3 + 1] = top.y + bd.y * u;
            flowPos[j * 3 + 2] = top.z + bd.z * u + flowOff[j * 2 + 1];
          }
          flowGeo.attributes.position.needsUpdate = true;
        } else {
          flowPts.visible = false;
        }
      } else {
        beam.visible = false;
        flowPts.visible = false;
      }

      if (p.suggested && p.suggested !== p.current) {
        suggestPin.visible = true;
        const s = groundSpot(p.suggested);
        suggestPin.position.set(s.x, 0.25 + Math.abs(Math.sin(t * 3.2)) * 0.35, s.z);
      } else {
        suggestPin.visible = false;
      }

      const wantQ = p.current ? p.queueSize : 0;
      if (queue.children.length !== wantQ) {
        while (queue.children.length) queue.remove(queue.children[0]);
        for (let k = 0; k < wantQ; k++) {
          const q = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0xe8484f, emissive: 0xe8484f, emissiveIntensity: 0.6 })
          );
          q.position.y = 0.12;
          queue.add(q);
        }
      }
      if (wantQ && p.current) {
        const s = groundSpot(p.current);
        queue.children.forEach((q, k) => {
          q.position.x = s.x + (k - (wantQ - 1) / 2) * 0.55;
          q.position.z = s.z + 1.1;
        });
      }

      rooms.forEach((r, id) => {
        const st = p.statusMap[id];
        const busy = !!st && st.state !== "idle";
        r.floor.emissiveIntensity = busy
          ? world.baseGlow + 0.11 + 0.18 * Math.sin(t * 4)
          : world.baseGlow;
      });

      world.streams.forEach((s) => {
        for (let j = 0; j < s.n; j++) {
          const u = (t * 0.1 + s.ph[j]) % 1;
          const pt = s.curve.getPoint(u);
          s.pos[j * 3] = pt.x;
          s.pos[j * 3 + 1] = pt.y;
          s.pos[j * 3 + 2] = pt.z;
        }
        s.geo.attributes.position.needsUpdate = true;
      });

      for (let k = world.pulses.length - 1; k >= 0; k--) {
        const pu = world.pulses[k];
        pu.t += dt / 1.4;
        if (pu.t >= 1) {
          scene.remove(pu.mesh);
          world.pulses.splice(k, 1);
          propsRef.current.onFlightDone(pu.id);
        } else {
          const e = pu.t * pu.t * (3 - 2 * pu.t);
          pu.mesh.position.copy(pu.curve.getPoint(e));
        }
      }

      // staff errands: the sender personally carries peer and upward memos
      for (let k = world.trips.length - 1; k >= 0; k--) {
        const tr = world.trips[k];
        if (tr.phase === 0) {
          tr.t += dt / 1.3;
          if (tr.t >= 1) {
            tr.phase = 1;
            tr.t = 0;
            tr.g.position.copy(tr.out.getPoint(1));
          } else {
            const e = tr.t * tr.t * (3 - 2 * tr.t);
            tr.g.position.copy(tr.out.getPoint(e));
          }
        } else if (tr.phase === 1) {
          tr.t += dt / 0.9;
          const p0 = tr.out.getPoint(1);
          tr.g.position.set(p0.x, p0.y + Math.abs(Math.sin(t * 6)) * 0.04, p0.z);
          if (tr.t >= 1) {
            tr.phase = 2;
            tr.t = 0;
          }
        } else {
          tr.t += dt / 1.3;
          if (tr.t >= 1) {
            scene.remove(tr.g);
            tr.fig.visible = true;
            world.trips.splice(k, 1);
            propsRef.current.onFlightDone(tr.id);
          } else {
            const e = tr.t * tr.t * (3 - 2 * tr.t);
            tr.g.position.copy(tr.back.getPoint(e));
          }
        }
      }

      for (let k = world.papers.length - 1; k >= 0; k--) {
        const pa = world.papers[k];
        pa.t += dt;
        const kk = Math.min(pa.t / 1.35, 1);
        const e = kk * kk * (3 - 2 * kk);
        const tx = me.position.x + 0.42,
          tz = me.position.z + 0.25;
        pa.mesh.position.set(
          pa.from.x + (tx - pa.from.x) * e,
          pa.from.y + (0.28 - pa.from.y) * e,
          pa.from.z + (tz - pa.from.z) * e
        );
        pa.mesh.rotation.z = kk * 2.4;
        pa.mesh.rotation.x = -1.1 + kk * 0.5;
        if (kk >= 1) {
          if (pa.ghost) {
            const fade = 1 - (pa.t - 1.35) / 0.6;
            (pa.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, fade);
            if (fade <= 0) {
              scene.remove(pa.mesh);
              world.papers.splice(k, 1);
            }
          } else {
            scene.remove(pa.mesh);
            world.papers.splice(k, 1);
            world.stackShown += 1;
            world.rebuildStack();
          }
        }
      }

      dusts.forEach((D) => {
        for (let j = 0; j < D.n; j++) {
          D.pos[j * 3 + 1] += dt * D.speed * world.dustBoost;
          if (D.pos[j * 3 + 1] > D.top) D.pos[j * 3 + 1] = 0;
        }
        D.geo.attributes.position.needsUpdate = true;
      });
      for (let j = 0; j < colN; j++) {
        colPos[j * 3 + 1] += dt * 0.55;
        if (colPos[j * 3 + 1] > 12.2) colPos[j * 3 + 1] = 0;
      }
      colGeo.attributes.position.needsUpdate = true;
      plants.forEach((pl) => {
        pl.rotation.z = 0.035 * Math.sin(t * 0.8 + (pl.userData.ph as number));
        pl.rotation.x = 0.025 * Math.sin(t * 0.6 + (pl.userData.ph as number) * 1.7);
      });
      floats.forEach((F) => {
        F.g.position.y = F.y + 0.1 * Math.sin(t * 0.65 + F.ph);
        F.g.rotation.y = 0.06 * Math.sin(t * 0.3 + F.ph);
      });

      camera.position.set(
        cam.target.x + cam.dist * Math.sin(cam.pol) * Math.sin(cam.az),
        cam.target.y + cam.dist * Math.cos(cam.pol),
        cam.target.z + cam.dist * Math.sin(cam.pol) * Math.cos(cam.az)
      );
      camera.lookAt(cam.target);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(world.raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
      wrap.removeChild(el);
      worldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    world.streams.forEach((s) => {
      world.streamsGroup.remove(s.obj);
      s.geo.dispose();
      (s.obj.material as THREE.Material).dispose();
    });
    world.streams = props.memoRoutes.map((r) =>
      makeStream(
        world.streamsGroup,
        boxTop(r.from).add(new THREE.Vector3(0, 0.15, 0)),
        boxTop(r.to).add(new THREE.Vector3(0, 0.15, 0)),
        CHANNEL_COLOR[r.channel],
        Math.min(30 + r.n * 12, 90),
        1.6 + Math.min(r.n, 4) * 0.3
      )
    );
  }, [props.memoRoutes]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    while (world.trailGroup.children.length) {
      const c = world.trailGroup.children[0] as THREE.Line;
      world.trailGroup.remove(c);
      c.geometry.dispose();
      (c.material as THREE.Material).dispose();
    }
    for (const seg of props.trail) {
      const a = groundSpot(seg.a);
      const b = groundSpot(seg.b);
      a.y = b.y = 0.03;
      const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
      const li = new THREE.Line(
        geo,
        new THREE.LineDashedMaterial({
          color: 0xc9d2e4,
          transparent: true,
          opacity: Math.min(0.2 + seg.n * 0.12, 0.6),
          dashSize: 0.3,
          gapSize: 0.22,
        })
      );
      li.computeLineDistances();
      world.trailGroup.add(li);
    }
  }, [props.trail]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    for (const f of props.flights) {
      if (spawned.current.has(f.id)) continue;
      spawned.current.add(f.id);
      const ch = f.channel ?? "peer";
      const sender = world.rooms.get(f.from);
      if (!f.reply && sender && sender.fig.visible && (ch === "peer" || ch === "up")) {
        // consults and escalations are carried in person
        const o = ROOMS[f.from];
        const to = ROOMS[f.to];
        const start = sender.figWorld.clone();
        const end = boxBottom(f.to).add(new THREE.Vector3(0, 0.06, to.d * 0.32));
        const mid = new THREE.Vector3(
          (start.x + end.x) / 2,
          Math.max(boxTop(f.from).y, boxTop(f.to).y) + 1.6,
          (start.z + end.z) / 2
        );
        const g = world.mkFig(o.c, Math.min(1, o.h / 1.7));
        const memo = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.04, 0.16),
          new THREE.MeshStandardMaterial({ color: 0xf2f4f6, emissive: 0xf2f4f6, emissiveIntensity: 0.45 })
        );
        memo.position.set(0.22, 0.78, 0.05);
        g.add(memo);
        g.position.copy(start);
        world.scene.add(g);
        sender.fig.visible = false;
        world.trips.push({
          id: f.id,
          out: new THREE.QuadraticBezierCurve3(start, mid, end),
          back: new THREE.QuadraticBezierCurve3(end, mid, start),
          g,
          t: 0,
          phase: 0,
          fig: sender.fig,
        });
        continue;
      }
      const a = boxTop(f.from).add(new THREE.Vector3(0, 0.15, 0));
      const b = boxTop(f.to).add(new THREE.Vector3(0, 0.15, 0));
      const mid = new THREE.Vector3((a.x + b.x) / 2, Math.max(a.y, b.y) + 2.2, (a.z + b.z) / 2);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const color = CHANNEL_COLOR[ch];
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(f.reply ? 0.12 : 0.16, 12, 10),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      mesh.position.copy(a);
      world.scene.add(mesh);
      world.pulses.push({ id: f.id, curve, mesh, t: 0 });
    }
  }, [props.flights]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    if (prevDocs.current === -1) {
      prevDocs.current = props.docCount;
      world.stackShown = props.docCount;
      world.rebuildStack();
      return;
    }
    if (props.docCount > prevDocs.current && props.current) {
      const from = boxBottom(props.current);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.44),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.5,
          side: THREE.DoubleSide,
          transparent: true,
        })
      );
      mesh.position.copy(from);
      mesh.rotation.x = -1.1;
      world.scene.add(mesh);
      world.papers.push({ mesh, t: 0, from });
    }
    prevDocs.current = props.docCount;
  }, [props.docCount, props.current]);

  // a required-materials slip drops and dissolves on the ground
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    if (prevTodos.current === -1) {
      prevTodos.current = props.todoCount;
      return;
    }
    if (props.todoCount > prevTodos.current && props.current) {
      const from = boxBottom(props.current);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.44),
        new THREE.MeshStandardMaterial({
          color: 0xffd9d4,
          emissive: 0xf0847e,
          emissiveIntensity: 0.4,
          side: THREE.DoubleSide,
          transparent: true,
        })
      );
      mesh.position.copy(from);
      mesh.rotation.x = -1.1;
      world.scene.add(mesh);
      world.papers.push({ mesh, t: 0, from, ghost: true });
    }
    prevTodos.current = props.todoCount;
  }, [props.todoCount, props.current]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    world.rooms.forEach((r, id) => {
      const st = props.statusMap[id];
      const busy = !!st && st.state !== "idle";
      if (!busy || !st) {
        r.status.sprite.visible = false;
        return;
      }
      const text =
        st.state === "consulting" && st.target
          ? "MEMO → " + AGENT_MAP[st.target].personName.split(" ")[0].toUpperCase()
          : STATE_TEXT[st.state];
      r.status.set(text);
      r.status.sprite.visible = true;
    });
  }, [props.statusMap]);

  // hall conditions change the weather of the void
  useEffect(() => {
    const w = worldRef.current;
    if (!w) return;
    const c = props.conditionId;
    const bg = c === "ninth_hour" ? 0x0a0712 : 0x06070a;
    (w.scene.background as THREE.Color).setHex(bg);
    (w.scene.fog as THREE.FogExp2).color.setHex(bg);
    if (c === "ninth_hour") {
      w.amb.color.setHex(0xc9a68e);
      w.amb.intensity = 0.22;
      w.dl.color.setHex(0xff9f6a);
      w.dl.intensity = 0.42;
      w.dl.position.set(-14, 10, -6);
      w.baseGlow = 0.46;
      w.dustBoost = 0.8;
    } else if (c === "rush") {
      w.amb.color.setHex(0x9fb2d6);
      w.amb.intensity = 0.36;
      w.dl.color.setHex(0xdfe8ff);
      w.dl.intensity = 0.3;
      w.dl.position.set(10, 26, 8);
      w.baseGlow = 0.36;
      w.dustBoost = 1.8;
    } else if (c === "ten_to_five") {
      w.amb.color.setHex(0xb6c4dd);
      w.amb.intensity = 0.3;
      w.dl.color.setHex(0xe8eeff);
      w.dl.intensity = 0.34;
      w.dl.position.set(16, 20, 10);
      w.baseGlow = 0.34;
      w.dustBoost = 0.9;
    } else {
      w.amb.color.setHex(0x9fb2d6);
      w.amb.intensity = 0.32;
      w.dl.color.setHex(0xdfe8ff);
      w.dl.intensity = 0.28;
      w.dl.position.set(10, 26, 8);
      w.baseGlow = 0.34;
      w.dustBoost = 1;
    }
  }, [props.conditionId]);

  const setCam = (which: "my" | "orbit" | "elev") => {
    const w = worldRef.current;
    if (!w) return;
    const c = w.cam;
    if (which === "orbit") {
      c.az = 0.55;
      c.pol = 1.12;
      c.dist = 30;
      c.target.set(0, 5.8, 0);
    } else if (which === "elev") {
      c.az = 0;
      c.pol = 1.35;
      c.dist = 34;
      c.target.set(0, 6, 0);
    } else {
      const m = w.me.position;
      c.target.set(m.x, 4.2, m.z);
      c.dist = 15;
      c.pol = 1.42;
      const l = Math.hypot(m.x, m.z) || 1;
      c.az = Math.atan2(m.x / l, m.z / l);
    }
  };

  const doss = dossier
    ? (() => {
        const a = AGENT_MAP[dossier];
        const o = ROOMS[dossier];
        const st = props.statusMap[dossier];
        const exp = loadExperience();
        const tl = exp.tallies[dossier];
        const lastNote = (exp.notes[dossier] ?? []).slice(-1)[0];
        const drift = driftY(dossier);
        const role =
          a.level === 1
            ? "Director"
            : a.level === 2
              ? "Section chief"
              : a.level === 3
                ? `Window ${a.windowNo} officer`
                : "Trainee";
        const live =
          st && st.state !== "idle"
            ? st.state === "consulting" && st.target
              ? `memo → ${AGENT_MAP[st.target].personName}`
              : STATE_TEXT[st.state].toLowerCase()
            : "idle";
        return { a, o, tl, lastNote, drift, role, live };
      })()
    : null;

  return (
    <div className="void-wrap" ref={wrapRef}>
      <div className="void-hint">
        {researcher
          ? "researcher view · click anyone to read their record"
          : "click a window · drag to orbit · scroll to zoom"}
      </div>
      <div className="void-ui">
        <button onClick={() => setCam("my")}>MY VIEW</button>
        <button onClick={() => setCam("orbit")}>ORBIT</button>
        <button onClick={() => setCam("elev")}>ELEVATION</button>
        <button
          onClick={() => {
            const w = worldRef.current;
            if (!w) return;
            w.cam.auto = !w.cam.auto;
            setAutoLabel(w.cam.auto);
          }}
        >
          AUTO: {autoLabel ? "ON" : "OFF"}
        </button>
        <button
          onClick={() => {
            const next = !researcher;
            setResearcher(next);
            researcherRef.current = next;
            if (!next) setDossier(null);
          }}
        >
          RESEARCHER: {researcher ? "ON" : "OFF"}
        </button>
      </div>
      {doss && (
        <div className="void-doss">
          <button className="vd-close" onClick={() => setDossier(null)}>
            ×
          </button>
          <div className="vd-name">{doss.a.personName}</div>
          <div className="vd-dept">
            <span
              className="vd-dot"
              style={{ background: `#${doss.o.c.toString(16).padStart(6, "0")}` }}
            />
            {doss.a.dept} · {doss.role}
          </div>
          <div className="vd-floor">
            altitude: floor {((doss.o.y + doss.drift) / 3).toFixed(2)}F
            {doss.drift > 0 ? ` (+${doss.drift.toFixed(2)} earned)` : ""}
          </div>
          <div className="vd-line">
            {doss.a.tenureYears} yrs in the hall
            {doss.a.status ? ` · ${doss.a.status}` : ""}
          </div>
          <div className="vd-line">now: {doss.live}</div>
          {doss.tl ? (
            <>
              <div className="vd-line">
                cases {doss.tl.cases} · replies {doss.tl.exchanges} · docs {doss.tl.docs}
              </div>
              <div className="vd-line">
                memos {doss.tl.memosOut} out / {doss.tl.memosIn} in · escalated{" "}
                {doss.tl.escalations} · assigned {doss.tl.assignmentsReceived}
              </div>
            </>
          ) : (
            <div className="vd-line">no service record yet</div>
          )}
          {doss.lastNote && (
            <div className="vd-note">
              “{doss.lastNote.text.length > 120 ? doss.lastNote.text.slice(0, 120) + "…" : doss.lastNote.text}”
            </div>
          )}
          <div className="vd-foot">RESEARCHER VIEW · LIVE SERVICE RECORD</div>
        </div>
      )}
    </div>
  );
}
