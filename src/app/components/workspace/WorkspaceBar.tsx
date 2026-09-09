"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/authFetch";
import type { CareerWorkspace } from "../../hooks/useCareerWorkspace";
import type { WorkspacePayload } from "../../lib/workspace";
export function downloadText(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9 -]/gi, "").slice(0, 80) || "ScreenMe"}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function WorkspaceBar({
  workspace: w,
  disabled = false,
}: {
  workspace: CareerWorkspace;
  disabled?: boolean;
}) {
  const [versions, setVersions] = useState<
    | {
        id: string;
        revision: number;
        payload: WorkspacePayload;
        created_at: string;
      }[]
    | null
  >(null);
  const [error, setError] = useState("");
  const activeId = useRef(w.id);
  activeId.current = w.id;
  useEffect(() => {
    setVersions(null);
    setError("");
  }, [w.id, w.owner]);
  if (!w.owner) return null;
  async function history() {
    const id = w.id;
    setError("");
    if (!(await w.flush())) return;
    try {
      const response = await authFetch(`/api/workspaces?id=${w.id}&versions=1`);
      const data = await response.json();
      if (activeId.current !== id) return;
      if (!response.ok) {
        setError(data.error);
        return;
      }
      setVersions(data.versions);
    } catch {
      if (activeId.current === id)
        setError("History could not be loaded. Please retry.");
    }
  }
  return (
    <section
      aria-label="Saved workspace"
      className="border border-border rounded-xl bg-surface p-4 mb-6"
    >
      {w.applicationId && (
        <Link
          className="block text-xs underline mb-3"
          href={`/applications/${w.applicationId}`}
        >
          Back to application
        </Link>
      )}
      <fieldset
        disabled={disabled || !w.ready}
        className="flex flex-wrap items-center gap-3 disabled:opacity-50"
      >
        <label className="flex-1 min-w-40">
          <span className="sr-only">Workspace name</span>
          <input
            aria-label="Workspace name"
            value={w.title}
            maxLength={160}
            onChange={(e) => w.setTitle(e.target.value)}
            className="w-full bg-transparent font-medium outline-none border-b border-transparent focus:border-fg"
          />
        </label>
        <select
          aria-label="Open saved workspace"
          value={w.entries.some((row) => row.id === w.id) ? w.id : ""}
          onChange={(e) => {
            setVersions(null);
            void w.open(e.target.value);
          }}
          className="bg-bg border border-border rounded px-2 py-2 text-xs max-w-52"
        >
          <option value="" disabled>
            Saved work
          </option>
          {w.entries.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setVersions(null);
            void w.fresh();
          }}
          className="text-xs underline"
        >
          New
        </button>
        <button
          type="button"
          onClick={() => void w.fresh(true)}
          className="text-xs underline"
        >
          Save a copy
        </button>
        <button
          type="button"
          disabled={!w.revision}
          onClick={() => void history()}
          className="text-xs underline disabled:opacity-40"
        >
          History
        </button>
        <button
          type="button"
          disabled={!w.revision}
          onClick={() =>
            void w
              .remove()
              .catch(() =>
                setError("Could not delete this workspace. Please retry."),
              )
          }
          className="text-xs text-fg-muted disabled:opacity-40"
        >
          Delete
        </button>
      </fieldset>
      <p role="status" className="mt-2 text-xs text-fg-muted">
        {w.status}
        {w.dirty ? " · Keep this page open until saved." : ""}
      </p>
      {w.error && (
        <p role="alert" className="text-sm mt-2">
          {w.error}{" "}
          <button onClick={w.retry} className="underline">
            Retry save
          </button>{" "}
          ·{" "}
          <button
            onClick={() => downloadText(w.payload.resume, w.title)}
            className="underline"
          >
            Download resume
          </button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {versions && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="flex justify-between">
            <p className="text-xs text-fg-muted">
              Last 10 completed reports · Restoring does not run AI or use your
              allowance.
            </p>
            <button
              onClick={() => setVersions(null)}
              aria-label="Close history"
            >
              ×
            </button>
          </div>
          {!versions.length && (
            <p className="text-sm mt-3">
              Complete a review to start your history.
            </p>
          )}
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between py-3 border-b border-border text-sm"
            >
              <span>{new Date(v.created_at).toLocaleString()}</span>
              <button
                disabled={disabled}
                className="underline"
                onClick={() => {
                  void w.restore(v.payload);
                  setVersions(null);
                }}
              >
                Restore report
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
