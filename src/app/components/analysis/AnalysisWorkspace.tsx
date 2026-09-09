"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import ResumeUploader from "../ResumeUploader";
import PlanChecker from "../PlanChecker";
import JobImportHint from "../JobImportHint";
import { authFetch } from "../../lib/authFetch";
import {
  MAX_JOB_LENGTH,
  MAX_RESUME_LENGTH,
  type ScanResult,
  type MatchResult,
  type Requirement,
} from "../../lib/analysisV2";

const ratingLabels = {
  strong: "Strong",
  developing: "Developing",
  limited: "Needs detail",
  not_assessable: "Not assessable",
};
const statusLabels = {
  supported: "Supported",
  partial: "Partial evidence",
  not_evidenced: "Not evidenced",
};
const importanceLabels = {
  required: "Required",
  preferred: "Nice-to-have",
  unspecified: "Role expectation",
};
const dimensionLabels = {
  clarity: "Clarity",
  impact: "Evidence of impact",
  organization: "Organization",
};

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function Evidence({ label, text }: { label: string; text: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-fg-subtle mb-2">
        {label}
      </p>
      {text ? (
        <blockquote className="text-sm leading-relaxed text-fg break-words whitespace-pre-line">
          “{text}”
        </blockquote>
      ) : (
        <p className="text-sm text-fg-muted">
          No supporting passage identified in this resume.
        </p>
      )}
    </div>
  );
}
function CopyAction({ text }: { text: string }) {
  const [state, setState] = useState("Copy");
  return (
    <button
      type="button"
      className="shrink-0 text-xs font-medium text-fg-muted hover:text-fg px-2 py-1 rounded-md border border-border"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("Copied");
        } catch {
          setState("Select text to copy");
        }
      }}
    >
      {state}
    </button>
  );
}
function NextStep({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl bg-surface-2 p-4">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-fg-subtle mb-1">
          Next step
        </p>
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
      <CopyAction text={text} />
    </div>
  );
}

export function ScanReport({ result }: { result: ScanResult }) {
  const [tab, setTab] = useState<"findings" | "strengths">("findings");
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <span className="section-label">Your resume, reviewed</span>
          <span className="text-xs text-fg-subtle">V2</span>
        </div>
        <h2 className="text-2xl sm:text-3xl leading-tight mb-4">
          {result.findings.length
            ? `${result.findings.length} ${result.findings.length === 1 ? "way" : "ways"} to make it clearer.`
            : "A solid foundation to build on."}
        </h2>
        <p className="text-sm text-fg-muted leading-relaxed">
          {result.summary}
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mt-7">
          {Object.entries(result.assessments).map(([key, item]) => (
            <details
              key={key}
              className="group rounded-xl border border-border p-4 bg-bg"
            >
              <summary className="cursor-pointer list-none">
                <span className="block text-xs text-fg-muted mb-3">
                  {dimensionLabels[key as keyof typeof dimensionLabels]}
                </span>
                <span
                  className={`block text-sm font-semibold ${item.rating === "strong" ? "text-green" : item.rating === "limited" ? "text-orange" : "text-fg"}`}
                >
                  {ratingLabels[item.rating]}
                </span>
                <span className="text-[10px] text-fg-subtle block mt-2 group-open:hidden">
                  View evidence +
                </span>
              </summary>
              <p className="text-xs text-fg-muted leading-relaxed mt-3">
                {item.explanation}
              </p>
              {item.evidence && (
                <blockquote className="text-xs border-l-2 border-border pl-2 mt-3 break-words">
                  “{item.evidence}”
                </blockquote>
              )}
            </details>
          ))}
        </div>
        <p className="text-xs text-fg-subtle mt-5 leading-relaxed">
          A review of the supplied text. Original PDF layout and ATS acceptance
          cannot be determined from this analysis.
        </p>
      </div>
      <div>
        <div
          className="flex gap-1 border-b border-border mb-5"
          aria-label="Resume review sections"
        >
          {(["findings", "strengths"] as const).map((value) => (
            <button
              key={value}
              id={`tab-${value}`}
              aria-pressed={tab === value}
              aria-controls={`panel-${value}`}
              onClick={() => setTab(value)}
              className={`px-4 py-3 text-sm border-b-2 ${tab === value ? "border-fg text-fg font-semibold" : "border-transparent text-fg-muted"}`}
            >
              {value === "findings" ? "Priority improvements" : "What works"}{" "}
              <span className="ml-2 text-xs text-fg-subtle">
                {result[value].length}
              </span>
            </button>
          ))}
        </div>
        <div
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="space-y-3"
        >
          {tab === "findings" ? (
            result.findings.length ? (
              result.findings.map((item, i) => (
                <details
                  key={i}
                  open={i === 0}
                  className="group bg-surface border border-border rounded-xl overflow-hidden"
                >
                  <summary className="cursor-pointer list-none p-5 flex gap-4 items-start">
                    <span className="text-xs text-fg-subtle font-mono mt-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 items-center mb-2">
                        <span
                          className={`text-[10px] uppercase tracking-wider ${item.priority === "high" ? "text-red" : item.priority === "medium" ? "text-orange" : "text-fg-subtle"}`}
                        >
                          {item.priority} priority
                        </span>
                        <span className="text-[10px] text-fg-subtle">
                          / {item.section}
                        </span>
                      </div>
                      <h3 className="text-base leading-snug">{item.title}</h3>
                    </div>
                    <span
                      aria-hidden="true"
                      className="text-fg-subtle group-open:rotate-45 transition-transform"
                    >
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-5 sm:pl-13">
                    <p className="text-sm text-fg-muted leading-relaxed mb-4">
                      {item.explanation}
                    </p>
                    <Evidence label="From your resume" text={item.evidence} />
                    <NextStep text={item.nextStep} />
                  </div>
                </details>
              ))
            ) : (
              <div className="rounded-xl border border-border p-6 text-sm text-fg-muted">
                No specific priority improvements were identified in this
                review. Compare against a target job for a more focused check.
              </div>
            )
          ) : result.strengths.length ? (
            result.strengths.map((item, i) => (
              <article
                key={i}
                className="bg-surface border border-border rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-green" aria-hidden="true">
                    ✓
                  </span>
                  <h3 className="text-base">{item.title}</h3>
                </div>
                <p className="text-sm text-fg-muted mb-4">{item.explanation}</p>
                <Evidence label="From your resume" text={item.evidence} />
              </article>
            ))
          ) : (
            <p className="text-sm text-fg-muted p-5">
              No specific strengths were supported strongly enough to highlight.
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3 border-t border-border pt-5">
        <p className="text-sm text-fg-muted">Have a particular role in mind?</p>
        <Link
          href="/jobmatch"
          className="text-sm font-semibold flex items-center gap-2"
        >
          Compare it to a job <Arrow />
        </Link>
      </div>
    </div>
  );
}

export function MatchReport({ result }: { result: MatchResult }) {
  const [filter, setFilter] = useState<"all" | "attention" | "supported">(
    "all",
  );
  const requirements = result.requirements.filter(
    (r) =>
      filter === "all" ||
      (filter === "attention"
        ? r.status !== "supported"
        : r.status === "supported"),
  );
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <span className="section-label">Documented alignment</span>
          <span className="text-xs text-fg-subtle">V2</span>
        </div>
        <div className="flex items-end gap-4 mb-5">
          <span className="text-6xl sm:text-7xl font-medium tracking-[-0.06em] leading-none">
            {result.coverage.percent}
            <span className="text-3xl text-fg-subtle ml-1">%</span>
          </span>
          <h2 className="text-sm font-normal text-fg-muted max-w-36 mb-1 leading-snug">
            weighted requirement coverage
          </h2>
        </div>
        <p className="text-sm text-fg-muted leading-relaxed">
          {result.summary}
        </p>
        <div className="h-2 rounded-full bg-surface-3 overflow-hidden mt-6">
          <div
            className="h-full bg-green rounded-full"
            style={{ width: `${result.coverage.percent}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            ["Supported", result.coverage.supported],
            ["Partial", result.coverage.partial],
            ["Not evidenced", result.coverage.notEvidenced],
          ].map(([label, count]) => (
            <div key={label} className="border-l border-border pl-3">
              <p className="text-xl font-semibold">{count}</p>
              <p className="text-xs text-fg-subtle mt-1">{label}</p>
            </div>
          ))}
        </div>
        <details className="mt-6 pt-4 border-t border-border text-xs text-fg-subtle leading-relaxed">
          <summary className="cursor-pointer">
            How coverage is calculated
          </summary>
          <p className="mt-2">
            Required qualifications count 3, role expectations 2, and
            nice-to-haves 1. Supported evidence earns full credit; partial
            evidence earns half. The percentage covers the{" "}
            {result.coverage.total} requirement groups identified below, not
            every possible hiring criterion. It is not a probability of getting
            hired. Missing evidence does not mean you lack the qualification.
          </p>
        </details>
      </div>
      <div>
        <div className="flex justify-between items-center gap-3 mb-4 flex-wrap">
          <h2 className="text-lg">Requirement by requirement</h2>
          <div
            className="flex gap-1 rounded-lg bg-surface-2 p-1"
            aria-label="Filter requirements"
          >
            {(["all", "attention", "supported"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={filter === value}
                className={`px-3 py-2 rounded-md text-xs ${filter === value ? "bg-surface shadow-sm font-semibold" : "text-fg-muted"}`}
                onClick={() => setFilter(value)}
              >
                {value === "all"
                  ? "All"
                  : value === "attention"
                    ? "Needs attention"
                    : "Supported"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {requirements.map((item: Requirement) => (
            <details
              key={item.title}
              className="group rounded-xl border border-border bg-surface overflow-hidden"
            >
              <summary className="cursor-pointer list-none flex gap-3 items-start p-5">
                <span
                  className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${item.status === "supported" ? "bg-green" : item.status === "partial" ? "bg-orange" : "bg-fg-subtle"}`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base leading-snug mb-2">{item.title}</h3>
                  <div className="flex flex-wrap gap-x-2 text-xs text-fg-muted">
                    <span>{importanceLabels[item.importance]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{statusLabels[item.status]}</span>
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="group-open:rotate-45 text-fg-subtle transition-transform"
                >
                  +
                </span>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm text-fg-muted leading-relaxed mb-4">
                  {item.explanation}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Evidence label="The job asks for" text={item.jobEvidence} />
                  <Evidence
                    label="Your resume shows"
                    text={item.resumeEvidence}
                  />
                </div>
                {item.nextStep && <NextStep text={item.nextStep} />}
              </div>
            </details>
          ))}
          {!requirements.length && (
            <p className="p-5 border border-border rounded-xl text-sm text-fg-muted">
              No requirements in this view. Select All to see the complete
              comparison.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyReport({
  matching,
  loading,
}: {
  matching: boolean;
  loading: boolean;
}) {
  return (
    <div className="h-full min-h-[510px] rounded-2xl border border-border bg-surface p-7 sm:p-10 flex flex-col justify-center">
      <div aria-hidden="true" className="relative mx-auto w-56 mb-9">
        <div className="absolute inset-0 rotate-[-6deg] bg-surface-2 border border-border rounded-xl" />
        <div className="relative rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <div className="flex gap-3 items-center">
            <span
              className={`w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-fg-muted ${loading ? "animate-pulse" : ""}`}
            >
              ↗
            </span>
            <div className="space-y-2">
              <div className="w-20 h-2 bg-fg/30 rounded-full" />
              <div className="w-12 h-1.5 bg-border rounded-full" />
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="space-y-2">
            <div className="w-full h-1.5 bg-border rounded-full" />
            <div className="w-4/5 h-1.5 bg-border rounded-full" />
            <div className="w-5/6 h-1.5 bg-border rounded-full" />
          </div>
          <div className="rounded-md border border-green/30 bg-green/5 p-3 text-green text-[10px] flex items-center gap-2">
            <span>✓</span> Evidence comes first
          </div>
        </div>
      </div>
      <div className="text-center max-w-sm mx-auto" role="status">
        <p className="section-label mb-3">
          {loading ? "Review in progress" : "Built around your experience"}
        </p>
        <h2 className="text-2xl mb-3">
          {loading
            ? "Reading between the lines."
            : matching
              ? "Know where your resume aligns."
              : "Useful feedback starts here."}
        </h2>
        <p className="text-sm text-fg-muted leading-relaxed">
          {loading
            ? "Checking the text, identifying evidence, and preparing your next steps. This can take up to a minute."
            : matching
              ? "Compare the job’s actual requirements with your resume, with both passages side by side."
              : "Add your resume for a focused review of what works, what needs attention, and what to change next."}
        </p>
      </div>
      <div className="mt-9 pt-5 border-t border-border flex justify-center gap-5 text-[11px] text-fg-subtle">
        <span>Source evidence</span>
        <span>Clear priorities</span>
        <span>Practical next steps</span>
      </div>
    </div>
  );
}

export default function AnalysisWorkspace({
  kind,
}: {
  kind: "scan" | "match";
}) {
  const matching = kind === "match";
  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | MatchResult | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [uploaderKey, setUploaderKey] = useState(0);
  const canSubmit =
    resume.trim().length >= 100 &&
    resume.length <= MAX_RESUME_LENGTH &&
    (!matching || (job.trim().length >= 50 && job.length <= MAX_JOB_LENGTH));
  const updateResume = (text: string) => {
    setResume(text);
    setResult(null);
    setError("");
  };
  const updateJob = (text: string) => {
    setJob(text);
    setResult(null);
    setError("");
  };
  async function importJob() {
    setImporting(true);
    setImportError("");
    try {
      const response = await authFetch("/api/parseJobUrl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.description)
        throw new Error(
          data.error || "No description found. Paste the posting below.",
        );
      updateJob(data.description);
    } catch (caught) {
      setImportError(
        caught instanceof Error
          ? caught.message
          : "Could not import. Paste the description instead.",
      );
    } finally {
      setImporting(false);
    }
  }
  async function submit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await authFetch(
        matching ? "/api/jobMatch" : "/api/analyzeResume",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ScreenMe-Analysis-Version": "2",
          },
          body: JSON.stringify({
            resume,
            ...(matching ? { job } : { targetRole }),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "The analysis could not be completed. Please retry.",
        );
      if (data.version !== "2.0")
        throw new Error(
          "The tool was updated. Refresh the page and try again.",
        );
      setResult(data);
      requestAnimationFrame(() => {
        reportRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        reportRef.current?.focus({ preventScroll: true });
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not connect. Please retry.",
      );
    } finally {
      setLoading(false);
    }
  }
  function reset() {
    updateResume("");
    updateJob("");
    setTargetRole("");
    setJobUrl("");
    setImportError("");
    setUploaderKey((key) => key + 1);
  }
  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-[1244px] px-5 sm:px-8">
        <nav
          aria-label="Analysis tools"
          className="flex items-center justify-between gap-4 mb-10 border-b border-border pb-4"
        >
          <div className="flex items-center gap-2 text-xs">
            <Link href="/dashboard" className="text-fg-subtle hover:text-fg">
              Workspace
            </Link>
            <span className="text-fg-subtle">/</span>
            <span>{matching ? "Job matcher" : "Resume scanner"}</span>
          </div>
          <span className="border border-border rounded-full px-2.5 py-1 text-[10px] tracking-widest font-medium">
            VERSION 02
          </span>
        </nav>
        <header className="mb-9 flex flex-col sm:flex-row justify-between gap-6 sm:items-end">
          <div>
            <p className="section-label mb-3">
              {matching ? "Find the connection" : "Make every line count"}
            </p>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.045em] leading-[1.1] max-w-2xl">
              {matching
                ? "The role. Your resume.\nA clearer picture."
                : "Good experience deserves\na clearer resume."}
            </h1>
            <p className="text-sm sm:text-base text-fg-muted mt-4 max-w-xl">
              {matching
                ? "See the evidence, understand the gaps, and prepare your next move."
                : "See what works, understand what needs attention, and choose what to improve."}
            </p>
          </div>
          <Link
            href={matching ? "/resume" : "/jobmatch"}
            className="text-sm flex shrink-0 items-center gap-2 py-2 text-fg-muted hover:text-fg"
          >
            {matching ? "Resume scanner" : "Job matcher"}
            <Arrow />
          </Link>
        </header>
        <div className="grid lg:grid-cols-[minmax(0,410px)_minmax(0,1fr)] gap-7 items-start">
          <section
            aria-label="Analysis documents"
            className="min-w-0 bg-surface border border-border rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-border flex justify-between items-center">
              <h2 className="text-sm font-semibold">
                <span className="font-mono text-xs text-fg-subtle mr-3">
                  01
                </span>
                Your documents
              </h2>
              <button
                onClick={reset}
                disabled={loading || importing}
                className="text-xs text-fg-muted hover:text-fg disabled:opacity-40"
              >
                Clear
              </button>
            </div>
            <PlanChecker feature={matching ? "job_match" : "resume_scan"}>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
                className="p-6"
              >
                <fieldset
                  disabled={loading || importing}
                  className="space-y-6 min-w-0 disabled:opacity-60"
                >
                  <div>
                    <h3 className="text-sm mb-3">Your resume</h3>
                    <ResumeUploader
                      key={uploaderKey}
                      onResumeSubmit={updateResume}
                      disabled={loading || importing}
                    />
                    {resume && (
                      <p
                        className={`text-xs mt-3 ${resume.length > MAX_RESUME_LENGTH ? "text-red" : "text-fg-subtle"}`}
                      >
                        {resume.length > MAX_RESUME_LENGTH
                          ? "Maximum 50,000 characters. Shorten the text to continue."
                          : resume.trim().length < 100
                            ? "Add at least 100 characters to continue."
                            : "Ready to review"}
                      </p>
                    )}
                  </div>
                  {matching ? (
                    <div className="border-t border-border pt-6">
                      <label
                        htmlFor="job-description"
                        className="block text-sm font-semibold mb-3"
                      >
                        The job description
                      </label>
                      <details className="text-sm mb-3">
                        <summary className="cursor-pointer text-fg-muted text-xs">
                          Import from a job link
                        </summary>
                        <div className="flex gap-2 mt-3">
                          <input
                            aria-label="Job posting URL"
                            type="text"
                            inputMode="url"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (jobUrl.trim()) void importJob();
                              }
                            }}
                            value={jobUrl}
                            onChange={(e) => setJobUrl(e.target.value)}
                            placeholder="https://…"
                            className="min-w-0 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            disabled={!jobUrl.trim()}
                            onClick={importJob}
                            className="text-xs border border-border px-3 rounded-lg disabled:opacity-40"
                          >
                            Import
                          </button>
                        </div>
                        <JobImportHint />
                        <p className="text-xs text-red mt-2" role="alert">
                          {importError}
                        </p>
                      </details>
                      <textarea
                        id="job-description"
                        rows={9}
                        value={job}
                        onChange={(e) => updateJob(e.target.value)}
                        placeholder="Paste the full job posting, including responsibilities and qualifications…"
                        className="w-full resize-y rounded-xl bg-bg border border-border px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-fg/15"
                      />
                      <p
                        className={`text-xs mt-2 ${job.length > MAX_JOB_LENGTH ? "text-red" : "text-fg-subtle"}`}
                      >
                        {job.length > MAX_JOB_LENGTH
                          ? "Maximum 25,000 characters. Shorten the posting to continue."
                          : "Include the requirements and nice-to-haves for a useful comparison."}
                      </p>
                    </div>
                  ) : (
                    <div className="border-t border-border pt-6">
                      <label
                        htmlFor="target-role"
                        className="text-sm font-semibold block mb-2"
                      >
                        Target role{" "}
                        <span className="text-fg-subtle font-normal ml-1">
                          Optional
                        </span>
                      </label>
                      <input
                        id="target-role"
                        value={targetRole}
                        maxLength={120}
                        onChange={(e) => {
                          setTargetRole(e.target.value);
                          setResult(null);
                        }}
                        placeholder="e.g. Product designer, registered nurse"
                        className="w-full bg-bg border border-border rounded-lg px-3 py-3 text-sm"
                      />
                      <p className="text-xs text-fg-subtle mt-2">
                        Adds context to the review. Use Job matcher for a
                        specific posting.
                      </p>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full btn btn-primary flex justify-between items-center py-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>
                      {loading
                        ? "Reviewing…"
                        : matching
                          ? "Compare with this role"
                          : "Review my resume"}
                    </span>
                    <Arrow />
                  </button>
                </fieldset>
                {importing && (
                  <p role="status" className="text-xs mt-3 text-fg-muted">
                    Importing the job description…
                  </p>
                )}
                <p className="text-[11px] text-fg-subtle text-center mt-4">
                  Uses one {matching ? "job match" : "resume scan"} from your
                  plan.
                </p>
                {error && (
                  <p
                    role="alert"
                    className="text-sm text-red bg-red/5 border border-red/20 rounded-xl p-4 mt-4"
                  >
                    {error}
                  </p>
                )}
              </form>
            </PlanChecker>
          </section>
          <section
            aria-label="Analysis report"
            ref={reportRef}
            tabIndex={-1}
            className="min-w-0 scroll-mt-24 outline-none"
            aria-busy={loading}
          >
            {result ? (
              matching ? (
                <MatchReport result={result as MatchResult} />
              ) : (
                <ScanReport result={result as ScanResult} />
              )
            ) : (
              <EmptyReport matching={matching} loading={loading} />
            )}
          </section>
        </div>
        <p className="text-xs text-fg-subtle mt-8 leading-relaxed max-w-3xl">
          AI feedback can miss context. Check the quoted evidence and keep every
          claim accurate before applying.
        </p>
      </div>
    </div>
  );
}
