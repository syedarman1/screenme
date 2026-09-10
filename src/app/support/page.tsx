"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AccountBoundary from "../components/AccountBoundary";
import { authFetch } from "../lib/authFetch";
type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "handled";
  created_at: string;
};
function SupportContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"new" | "handled">("new");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setMessages([]);
    authFetch(`/api/support?status=${status}&page=${page}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) {
          setMessages(data.messages);
          setTotal(data.total);
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
  }, [status, page, refresh]);
  const reload = useCallback(() => setRefresh((value) => value + 1), []);
  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);
  const update = async (message: Message) => {
    setBusy(true);
    setError("");
    try {
      const response = await authFetch("/api/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: message.id,
          previousStatus: message.status,
          status: message.status === "new" ? "handled" : "new",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (messages.length === 1 && page > 0) setPage(page - 1);
      else reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update request.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page-shell">
      <div className="page-inner-md">
        <Link href="/account" className="text-sm text-fg-muted hover:underline">
          ← Your account
        </Link>
        <header className="my-8">
          <p className="section-label mb-2">SCREENME OPERATIONS</p>
          <h1 className="text-3xl font-semibold">Support inbox</h1>
          <p className="text-fg-muted mt-3">
            Customer requests from the contact form. Review, reply from your
            email app, then mark handled.
          </p>
        </header>
        <div className="flex flex-wrap justify-between gap-3 mb-6">
          <div className="flex gap-2">
            {(["new", "handled"] as const).map((value) => (
              <button
                key={value}
                onClick={() => {
                  setStatus(value);
                  setPage(0);
                }}
                aria-pressed={value === status}
                className={`btn ${value === status ? "btn-primary" : "btn-secondary"}`}
              >
                {value === "new" ? "Needs a reply" : "Handled"}
              </button>
            ))}
          </div>
          <button
            className="btn btn-secondary"
            disabled={loading}
            onClick={reload}
          >
            Refresh
          </button>
        </div>
        {error && (
          <p className="alert-error mb-5" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Loading requests…</p>
        ) : (
          !error && (
            <>
              <p className="text-sm text-fg-muted mb-4">
                {total} {status === "new" ? "open" : "handled"} requests
              </p>
              {!messages.length ? (
                <div className="card p-10 text-center">
                  <h2 className="font-semibold">
                    {status === "new"
                      ? "You’re all caught up."
                      : "No handled requests yet."}
                  </h2>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <article key={message.id} className="card p-6">
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold break-words">
                            {message.subject.replace(/-/g, " ")}
                          </h2>
                          <p className="text-sm text-fg-muted mt-1 break-all">
                            {message.name} · {message.email}
                          </p>
                        </div>
                        <time
                          className="text-xs text-fg-muted"
                          dateTime={message.created_at}
                        >
                          {new Date(message.created_at).toLocaleString()}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap break-words leading-7 my-5">
                        {message.message}
                      </p>
                      <p className="text-xs text-fg-muted break-all mb-4">
                        Reference: {message.id}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <a
                          className="btn btn-secondary"
                          href={`mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`ScreenMe support · ${message.id}`)}`}
                        >
                          Reply in email app
                        </a>
                        <button
                          disabled={busy}
                          className="btn btn-primary"
                          onClick={() => void update(message)}
                        >
                          {message.status === "new"
                            ? "Mark handled"
                            : "Reopen request"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 mt-6">
                <button
                  className="btn btn-secondary"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span className="text-sm">Page {page + 1}</span>
                <button
                  className="btn btn-secondary"
                  disabled={(page + 1) * 25 >= total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )
        )}
      </div>
    </main>
  );
}
export default function SupportPage() {
  return (
    <AccountBoundary>
      <SupportContent />
    </AccountBoundary>
  );
}
