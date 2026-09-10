import { AsyncLocalStorage } from "node:async_hooks";
export type Metrics = {
  calls: number;
  input: number;
  output: number;
  cost: number;
  complete: boolean;
  models: Set<string>;
};
export const aiMetrics = new AsyncLocalStorage<Metrics>();
export const newMetrics = (): Metrics => ({
  calls: 0,
  input: 0,
  output: 0,
  cost: 0,
  complete: true,
  models: new Set(),
});
// Price snapshot: official gpt-5.6-terra documentation, 2026-09-09, USD/million.
// Unknown models/audio remain explicitly unpriced rather than pretending to be free.
export function recordCompletion(result: {
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    prompt_tokens_details?: { cached_tokens?: number };
  } | null;
}) {
  const m = aiMetrics.getStore();
  if (!m) return;
  m.calls++;
  const name = result.model?.slice(0, 120) || "unknown";
  m.models.add(name);
  const u = result.usage;
  if (!u) {
    m.complete = false;
    return;
  }
  const input = Math.max(0, u.prompt_tokens),
    output = Math.max(0, u.completion_tokens);
  m.input += input;
  m.output += output;
  if (name === "gpt-5.6-terra" || name.startsWith("gpt-5.6-terra-")) {
    // Use the uncached rate for all input: a conservative estimate, not an invoice.
    m.cost += (input * 2 + output * 12) / 1_000_000;
  } else m.complete = false;
}
export function recordUnpricedCall(model: string) {
  const m = aiMetrics.getStore();
  if (m) {
    m.calls++;
    m.models.add(model);
    m.complete = false;
  }
}
