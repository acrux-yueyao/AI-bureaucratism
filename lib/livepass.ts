// Live-mode gate for public deployments. When AIB_LIVE_PASS is set on the
// server, the API routes refuse calls without a matching x-aib-pass header —
// visitors get the replays, the researcher unlocks live agents with a key.
// Unset (local dev), everything stays open.

const KEY = "aib-live-pass";

export function getLivePass(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setLivePass(pass: string) {
  try {
    window.localStorage.setItem(KEY, pass);
  } catch {
    // private mode: the key just won't persist
  }
}

export function liveHeaders(): Record<string, string> {
  const p = getLivePass();
  return p ? { "x-aib-pass": p } : {};
}

export function checkLivePass(req: Request): Response | null {
  const lock = process.env.AIB_LIVE_PASS;
  if (lock && req.headers.get("x-aib-pass") !== lock) {
    return Response.json({ error: "locked" }, { status: 401 });
  }
  return null;
}
