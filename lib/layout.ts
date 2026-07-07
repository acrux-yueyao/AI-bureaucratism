import type { AgentId } from "./types";

export type Spot = { x: number; y: number };

export const ENTRANCE: Spot = { x: 50, y: 86 };

export const HALL_LAYOUT: Record<AgentId, Spot> = {
  director: { x: 50, y: 8 },
  chief_front: { x: 32, y: 19 },
  chief_back: { x: 68, y: 19 },
  trainee_front: { x: 12, y: 19 },
  trainee_back: { x: 88, y: 19 },
  daoban: { x: 15, y: 46 },
  shouli: { x: 38.5, y: 46 },
  cailiao: { x: 62, y: 46 },
  zige: { x: 85.5, y: 46 },
  dangan: { x: 15, y: 70 },
  quanxian: { x: 38.5, y: 70 },
  fengkong: { x: 62, y: 70 },
  fuhe: { x: 85.5, y: 70 },
};
