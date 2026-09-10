"use client";
import AccountBoundary from "../components/AccountBoundary";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../lib/authFetch";
import { FEATURE_LABELS, type FeatureType } from "../lib/plans";
type Row = {
  feature: FeatureType;
  runs: number;
  successes: number;
  average_ms: number;
  input_tokens: number;
  output_tokens: number;
  known_cost_usd: number | null;
  unpriced_runs: number;
  helpful: number;
  unhelpful: number;
};
function InsightsContent() {
  const [rows, setRows] = useState<Row[]>([]);
  const [all, setAll] = useState(false);
  const [operator, setOperator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    authFetch(`/api/monitoring?scope=${all ? "all" : "mine"}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (active) {
          setRows(data.rows);
          setOperator(data.operator);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [all]);
  return (
    <main className="page-shell">
      <div className="max-w-6xl mx-auto px-6">
        <Link href="/account" className="text-sm underline">
          Your account
        </Link>
        <h1 className="text-3xl mt-8">
          {all ? "App health" : "Your tool activity"}
        </h1>
        <p className="text-fg-muted mt-3 mb-8">
          Last 30 days · Activity begins when monitoring is enabled. Documents,
          prompts, and generated text are excluded.
        </p>
        {operator && (
          <label className="flex gap-2 mb-6">
            <input
              type="checkbox"
              checked={all}
              onChange={(e) => setAll(e.target.checked)}
            />
            View all accounts
          </label>
        )}
        {error && <p role="alert">{error}</p>}
        {loading ? (
          <p>Loading activity…</p>
        ) : !rows.length ? (
          <p>No recorded activity yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {rows.map((r) => (
              <section key={r.feature} className="card p-6">
                <h2 className="text-xl">{FEATURE_LABELS[r.feature]}</h2>
                <dl className="grid grid-cols-2 gap-4 mt-5 text-sm">
                  <div>
                    <dt className="text-fg-muted">Completed</dt>
                    <dd>
                      {r.successes} / {r.runs}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-muted">Average response</dt>
                    <dd>{(r.average_ms / 1000).toFixed(1)}s</dd>
                  </div>
                  {operator && (
                    <div>
                      <dt className="text-fg-muted">Input / output tokens</dt>
                      <dd>
                        {r.input_tokens.toLocaleString()} /{" "}
                        {r.output_tokens.toLocaleString()}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-fg-muted">
                      Helpful / needs improvement
                    </dt>
                    <dd>
                      {r.helpful} / {r.unhelpful}
                    </dd>
                  </div>
                  {operator && (
                    <div>
                      <dt className="text-fg-muted">
                        Estimated known model cost
                      </dt>
                      <dd>
                        {r.known_cost_usd === null
                          ? "Not available"
                          : `$${Number(r.known_cost_usd).toFixed(4)}`}
                        {r.unpriced_runs > 0
                          ? ` · ${r.unpriced_runs} runs not fully priced`
                          : ""}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            ))}
          </div>
        )}
        <p className="text-xs text-fg-muted mt-8">
          {operator
            ? "Failures include rejected input and provider failures after an allowance is reserved. Unstarted, unauthorized, and quota-blocked requests are excluded. Cost estimates use published uncached model rates; unknown models, failed provider calls, and audio can be unpriced. Estimates are not invoices."
            : "This activity covers requests that reached a tool. Visit your dashboard to see your current plan allowances."}
        </p>
      </div>
    </main>
  );
}

export default function Insights() {
  return (
    <AccountBoundary>
      <InsightsContent />
    </AccountBoundary>
  );
}
