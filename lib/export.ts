import { loadAnalysis, loadCase } from "./storage";
import { loadArchive } from "./archive";

// Study-session export — one self-contained JSON with everything this browser
// produced: the current case (full event stream incl. conversations), the
// observer analysis if generated, and the permanent archive. Remote pilot
// participants tag themselves via ?pid=P1 on the hall URL; the id rides along
// in the filename and payload so returned files sort themselves.

const PID_KEY = "aib-pid";

export function storePid(pid: string) {
  try {
    window.localStorage.setItem(PID_KEY, pid);
  } catch {
    // private mode: the id just won't persist
  }
}

export function getPid(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PID_KEY) ?? "";
  } catch {
    return "";
  }
}

export function downloadSessionExport() {
  const pid = getPid();
  const current = loadCase();
  const payload = {
    format: "aib-session-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    participant: pid || null,
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
    current,
    analysis: loadAnalysis() || null,
    archive: loadArchive(),
  };
  const name = `aib-${pid || "anon"}-${current?.caseId ?? "session"}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
