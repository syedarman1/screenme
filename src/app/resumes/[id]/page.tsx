"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountBoundary from "../../components/AccountBoundary";
import { authFetch } from "../../lib/authFetch";
import { startResumeWorkspace } from "../../lib/resumeWorkspace";
import { WORKSPACE_LABELS, type WorkspaceKind } from "../../lib/workspace";

type Resume = { id: string; name: string; content: string; updated_at: string };
function ResumeContent({ id }: { id: string }) {
  const router = useRouter();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState<WorkspaceKind | null>(null);
  useEffect(() => {
    let active = true;
    authFetch(`/api/resumes?id=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) setResume(data.resume);
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
  }, [id]);
  const start = async (kind: WorkspaceKind) => {
    setOpening(kind);
    setError("");
    try {
      router.push(await startResumeWorkspace(id, kind));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open this tool.");
    } finally {
      setOpening(null);
    }
  };
  const download = () => {
    if (!resume) return;
    const url = URL.createObjectURL(
      new Blob([resume.content], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resume.name.replace(/[^a-z0-9 -]/gi, "").slice(0, 80) || "resume"}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <main className="page-shell">
      <div className="page-inner-md">
        <Link href="/resumes" className="text-sm text-fg-muted hover:underline">
          ← My Resumes
        </Link>
        {error && (
          <p role="alert" className="alert-error mt-6">
            {error}
          </p>
        )}
        {loading ? (
          <p className="mt-8" role="status">
            Loading resume…
          </p>
        ) : (
          resume && (
            <>
              <header className="my-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-label mb-2">YOUR SAVED RESUME</p>
                  <h1 className="text-3xl font-semibold break-words">
                    {resume.name}
                  </h1>
                  <p className="text-sm text-fg-muted mt-2">
                    Saved {new Date(resume.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={download} className="btn btn-secondary">
                  Download TXT
                </button>
              </header>
              <div className="grid md:grid-cols-[1fr_250px] gap-6 items-start">
                <section className="card p-6">
                  <h2 className="text-sm font-semibold mb-4">Resume content</h2>
                  <p className="whitespace-pre-wrap break-words text-sm leading-7">
                    {resume.content}
                  </p>
                </section>
                <aside className="card p-6">
                  <h2 className="font-semibold">Put this resume to work</h2>
                  <p className="text-sm text-fg-muted mt-2 mb-5">
                    Start with a copy in a saved workspace. Your original stays
                    in your collection.
                  </p>
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        "scan",
                        "match",
                        "tailor",
                        "letter",
                        "interview",
                      ] as WorkspaceKind[]
                    ).map((kind) => (
                      <button
                        key={kind}
                        disabled={opening !== null}
                        onClick={() => void start(kind)}
                        className={`btn ${kind === "scan" ? "btn-primary" : "btn-secondary"}`}
                      >
                        {opening === kind ? "Opening…" : WORKSPACE_LABELS[kind]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-fg-muted mt-4">
                    Uses one saved workspace. Running a tool uses its plan
                    allowance. Interview practice requires Pro.
                  </p>
                </aside>
              </div>
            </>
          )
        )}
      </div>
    </main>
  );
}
export default function ResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AccountBoundary>
      <ResumeContent id={id} />
    </AccountBoundary>
  );
}
