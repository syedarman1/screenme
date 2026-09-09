"use client";
import AccountBoundary from "../../components/AccountBoundary";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { authFetch } from "../../lib/authFetch";
import {
  WORKSPACE_LABELS,
  WORKSPACE_PATHS,
  type WorkspaceKind,
  type WorkspaceRow,
  type WorkspaceSummary,
} from "../../lib/workspace";
import ResumeUploader from "../../components/ResumeUploader";
type Application = {
  updated_at: string;
  id: string;
  company: string;
  role: string;
  status: string;
  notes: string | null;
  job_description: string | null;
};
function ApplicationContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [app, setApp] = useState<Application | null>(null);
  const [work, setWork] = useState<WorkspaceRow[]>([]);
  const [all, setAll] = useState<WorkspaceSummary[]>([]);
  const [resume, setResume] = useState("");
  const [notes, setNotes] = useState("");
  const [job, setJob] = useState("");
  const [status, setStatus] = useState("saved");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await authFetch(`/api/application-workspaces?id=${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setApp(data.application);
      setWork(data.workspaces);
      setNotes(data.application.notes ?? "");
      setJob(data.application.job_description ?? "");
      setStatus(data.application.status);
      const list = await authFetch("/api/workspaces");
      const entries = await list.json();
      if (list.ok) setAll(entries.workspaces);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open application.");
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save() {
    const response = await authFetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status,
        notes,
        job_description: job,
        expectedUpdatedAt: app?.updated_at,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setApp(data.application);
    setSaved(true);
  }
  async function run(kind?: WorkspaceKind, workspaceId?: string) {
    setBusy(true);
    setError("");
    try {
      await save();
      const response = await authFetch("/api/application-workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: id, workspaceId, kind, resume }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (kind)
        window.location.assign(`${WORKSPACE_PATHS[kind]}?review=${data.id}`);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open tool.");
    } finally {
      setBusy(false);
    }
  }
  const edited =
    app &&
    (notes !== (app.notes ?? "") ||
      job !== (app.job_description ?? "") ||
      status !== app.status);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (edited) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edited]);
  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!edited) return;
    event.preventDefault();
    setBusy(true);
    void save()
      .then(() => router.push(href))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }
  return (
    <main className="page-shell">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Link
          href="/applications"
          onClick={(e) => navigate(e, "/applications")}
          className="text-sm underline"
        >
          All applications
        </Link>
        {error && (
          <p role="alert" className="my-4">
            {error}
          </p>
        )}
        {!app ? (
          <p className="py-12">
            {error
              ? "This application is unavailable."
              : "Loading application…"}
          </p>
        ) : (
          <>
            <header className="my-8">
              <p className="section-label">{app.company}</p>
              <h1 className="text-3xl mt-3">{app.role}</h1>
              <p className="text-fg-muted mt-3">
                Your documents, preparation, and next steps for this
                opportunity.
              </p>
            </header>
            <fieldset
              disabled={busy}
              className="grid lg:grid-cols-2 gap-6 disabled:opacity-60"
            >
              <section className="card p-6 space-y-5">
                <h2 className="text-xl">Application details</h2>
                <label className="block text-sm">
                  Stage
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setSaved(false);
                    }}
                    className="input w-full mt-2"
                  >
                    {["saved", "applied", "interview", "offer", "rejected"].map(
                      (s) => (
                        <option key={s}>{s}</option>
                      ),
                    )}
                  </select>
                </label>
                <label className="block text-sm">
                  Job description
                  <textarea
                    maxLength={25000}
                    className="input w-full min-h-48 mt-2"
                    value={job}
                    onChange={(e) => {
                      setJob(e.target.value);
                      setSaved(false);
                    }}
                  />
                </label>
                <label className="block text-sm">
                  Notes and next steps
                  <textarea
                    maxLength={10000}
                    className="input w-full min-h-32 mt-2"
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setSaved(false);
                    }}
                  />
                </label>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setBusy(true);
                    void save()
                      .catch((e) => setError(e.message))
                      .finally(() => setBusy(false));
                  }}
                >
                  {saved && !edited ? "Saved" : "Save application"}
                </button>
                <p className="text-xs text-fg-muted">
                  Changes to the job apply to new work. Existing reports retain
                  the source they reviewed.
                </p>
              </section>
              <section className="card p-6">
                <h2 className="text-xl mb-5">Work for this application</h2>
                <div className="space-y-3 mb-6">
                  {work.length ? (
                    work.map((w) => (
                      <Link
                        onClick={(e) =>
                          navigate(
                            e,
                            `${WORKSPACE_PATHS[w.kind]}?review=${w.id}`,
                          )
                        }
                        key={w.id}
                        href={`${WORKSPACE_PATHS[w.kind]}?review=${w.id}`}
                        className="block border border-border rounded-xl p-4"
                      >
                        <p>{WORKSPACE_LABELS[w.kind]}</p>
                        <p className="text-xs text-fg-muted mt-2">
                          {w.payload.result
                            ? "Draft or report ready"
                            : "Work in progress"}{" "}
                          · {new Date(w.updated_at).toLocaleDateString()}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-fg-muted">
                      Start a tool below or attach saved work.
                    </p>
                  )}
                </div>
                <label className="block text-sm">
                  Attach existing work
                  <select
                    className="input w-full mt-2"
                    value=""
                    onChange={(e) => void run(undefined, e.target.value)}
                  >
                    <option value="" disabled>
                      Choose saved work
                    </option>
                    {all
                      .filter((w) => !work.some((link) => link.id === w.id))
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.title}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="border-t border-border my-6" />
                <h3 className="font-medium mb-3">Start with a resume</h3>
                {work.some((w) => w.payload.resume) && (
                  <select
                    aria-label="Reuse a resume from this application"
                    className="input w-full mb-4"
                    value=""
                    onChange={(e) =>
                      setResume(
                        (() => {
                          const w = work.find((w) => w.id === e.target.value);
                          return w?.kind === "tailor" &&
                            w.payload.result &&
                            "content" in w.payload.result
                            ? w.payload.result.content
                            : (w?.payload.resume ?? "");
                        })(),
                      )
                    }
                  >
                    <option value="" disabled>
                      Reuse a resume from this application
                    </option>
                    {work
                      .filter((w) => w.payload.resume)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {WORKSPACE_LABELS[w.kind]}
                        </option>
                      ))}
                  </select>
                )}
                <ResumeUploader value={resume} onResumeSubmit={setResume} />
                <div className="flex flex-wrap gap-3 mt-5">
                  {(Object.keys(WORKSPACE_LABELS) as WorkspaceKind[]).map(
                    (k) => (
                      <button
                        key={k}
                        className="btn btn-secondary text-xs"
                        onClick={() => void run(k)}
                      >
                        {WORKSPACE_LABELS[k]}
                      </button>
                    ),
                  )}
                </div>
                <p className="text-xs text-fg-muted mt-4">
                  Starting work saves your job details and chosen resume. AI
                  runs only when you request it inside the tool. Plan allowances
                  still apply.
                </p>
              </section>
            </fieldset>
          </>
        )}
      </div>
    </main>
  );
}

export default function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AccountBoundary>
      <ApplicationContent params={params} />
    </AccountBoundary>
  );
}
