import type { CaseState } from "./types";

const KEY = "aib-case";
const ANALYSIS_KEY = "aib-analysis";

export function loadCase(): CaseState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CaseState) : null;
  } catch {
    return null;
  }
}

export function saveCase(state: CaseState) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearCase() {
  window.localStorage.removeItem(KEY);
  window.localStorage.removeItem(ANALYSIS_KEY);
}

export function loadAnalysis(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ANALYSIS_KEY) ?? "";
}

export function saveAnalysis(text: string) {
  window.localStorage.setItem(ANALYSIS_KEY, text);
}
