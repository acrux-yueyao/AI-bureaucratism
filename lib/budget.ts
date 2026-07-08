import type { LlmUsage } from "./llm";

// Budget guard for batch experiments. Prices are USD per million tokens,
// deliberately CONSERVATIVE (list price or higher) so the tracker
// overestimates spend and stops early rather than late.
// Override per run: AIB_PRICE_IN / AIB_PRICE_OUT (USD per MTok).

const PRICES: Record<string, { inPerM: number; outPerM: number }> = {
  "claude-sonnet-5": { inPerM: 3, outPerM: 15 },
  "claude-sonnet-4-6": { inPerM: 3, outPerM: 15 },
  "claude-haiku-4-5": { inPerM: 1, outPerM: 5 },
  "claude-opus-4-8": { inPerM: 5, outPerM: 25 },
};

// Unknown models (incl. non-Anthropic): assume a high ceiling.
const FALLBACK = { inPerM: 10, outPerM: 50 };

export class BudgetTracker {
  private spentUSD = 0;
  calls = 0;

  constructor(public limitUSD: number) {}

  sink(model: string) {
    const envIn = Number(process.env.AIB_PRICE_IN);
    const envOut = Number(process.env.AIB_PRICE_OUT);
    const price =
      envIn > 0 && envOut > 0
        ? { inPerM: envIn, outPerM: envOut }
        : PRICES[model] ?? FALLBACK;
    return (u: LlmUsage) => {
      this.calls += 1;
      this.spentUSD +=
        (u.inputTokens / 1_000_000) * price.inPerM +
        (u.outputTokens / 1_000_000) * price.outPerM;
    };
  }

  get spent(): number {
    return this.spentUSD;
  }

  get exceeded(): boolean {
    return this.spentUSD >= this.limitUSD;
  }

  label(): string {
    return `$${this.spentUSD.toFixed(2)}/$${this.limitUSD} (${this.calls} calls)`;
  }
}
