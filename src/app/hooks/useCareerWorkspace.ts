"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { authFetch } from "../lib/authFetch";
import {
  blankWorkspace,
  WORKSPACE_LABELS,
  type WorkspaceKind,
  type WorkspacePayload,
  type WorkspaceRow,
  type WorkspaceSummary,
} from "../lib/workspace";
export function useCareerWorkspace(kind: WorkspaceKind) {
  const [payload, updatePayload] = useState<WorkspacePayload>(blankWorkspace);
  const [title, updateTitle] = useState(WORKSPACE_LABELS[kind]);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<WorkspaceSummary[]>([]);
  const [status, setStatus] = useState("Loading saved work…");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const current = useRef({ payload, title });
  current.current = { payload, title };
  const setPayload = useCallback((action: SetStateAction<WorkspacePayload>) => {
    const next =
      typeof action === "function" ? action(current.current.payload) : action;
    current.current = { ...current.current, payload: next };
    updatePayload(next);
  }, []);
  const setTitle = useCallback((value: string) => {
    current.current = { ...current.current, title: value };
    updateTitle(value);
  }, []);
  const identity = useRef({ id: "", revision: 0 });
  const baseline = useRef("");
  const epoch = useRef(0);
  const blocked = useRef(false);
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const encode = () => JSON.stringify(current.current);
  const publishId = (id: string) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("review", id);
    else url.searchParams.delete("review");
    window.history.replaceState(null, "", url);
  };
  const install = useCallback(
    (row: WorkspaceRow | null) => {
      setApplicationId(row?.applicationId ?? null);
      const next = row?.payload ?? blankWorkspace(),
        name = row?.title ?? WORKSPACE_LABELS[kind];
      identity.current = {
        id: row?.id ?? crypto.randomUUID(),
        revision: row?.revision ?? 0,
      };
      current.current = { payload: next, title: name };
      baseline.current = JSON.stringify(current.current);
      setPayload(next);
      setTitle(name);
      setDirty(false);
      blocked.current = false;
      setError("");
      setStatus(row ? "Saved to your account" : "New workspace");
    },
    [kind, setPayload, setTitle],
  );
  const refresh = useCallback(async () => {
    const response = await authFetch(`/api/workspaces?kind=${kind}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.workspaces as WorkspaceSummary[];
  }, [kind]);
  useEffect(() => {
    let active = true;
    supabase?.auth.getSession().then(({ data }) => {
      if (active) setOwner(data.session?.user.id ?? null);
    });
    const sub = supabase?.auth.onAuthStateChange((_event, session) =>
      setOwner(session?.user.id ?? null),
    );
    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    const generation = ++epoch.current;
    setReady(false);
    setEntries([]);
    install(null);
    if (!owner) {
      setStatus("Sign in to save your work");
      return;
    }
    (async () => {
      const rows = await refresh();
      if (generation !== epoch.current) return;
      setEntries(rows);
      const id =
        new URL(window.location.href).searchParams.get("review") ?? rows[0]?.id;
      if (id) {
        const response = await authFetch(
          `/api/workspaces?id=${encodeURIComponent(id)}`,
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (data.workspace.kind !== kind)
          throw new Error("This saved work belongs to another tool.");
        if (generation === epoch.current) {
          install(data.workspace);
          publishId(id);
        }
      }
      if (generation === epoch.current) setReady(true);
    })().catch((e) => {
      if (generation === epoch.current) {
        setError(e.message);
        setStatus("Could not load saved work");
        blocked.current = true;
        setReady(true);
      }
    });
    const epochRef = epoch;
    return () => {
      epochRef.current++;
    };
  }, [owner, kind, install, refresh]);
  const flush = useCallback(async () => {
    if (!owner || !ready || blocked.current) return false;
    const generation = epoch.current;
    const task = async () => {
      if (generation !== epoch.current) return false;
      const serialized = encode();
      if (serialized === baseline.current) return true;
      const snapshot = JSON.parse(serialized) as {
        payload: WorkspacePayload;
        title: string;
      };
      if (
        !snapshot.payload.resume.trim() &&
        !snapshot.payload.job.trim() &&
        !snapshot.payload.notes.trim() &&
        !identity.current.revision
      )
        return true;
      setStatus("Saving…");
      try {
        const response = await authFetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...identity.current, kind, ...snapshot }),
        });
        const data = await response.json();
        if (generation !== epoch.current) return false;
        if (!response.ok) throw new Error(data.error);
        identity.current = {
          id: data.workspace.id,
          revision: data.workspace.revision,
        };
        baseline.current = serialized;
        publishId(data.workspace.id);
        setEntries((rows) => [
          data.workspace,
          ...rows.filter((row) => row.id !== data.workspace.id),
        ]);
        setDirty(encode() !== serialized);
        setStatus(
          encode() === serialized ? "Saved to your account" : "Unsaved changes",
        );
        setError("");
        return true;
      } catch (e) {
        if (generation === epoch.current) {
          setError(e instanceof Error ? e.message : "Saving failed.");
          setStatus("Not saved");
          blocked.current = true;
        }
        return false;
      }
    };
    queue.current = queue.current.then(task, task);
    return queue.current;
  }, [owner, ready, kind]);
  useEffect(() => {
    if (!ready || !owner) return;
    const changed = encode() !== baseline.current;
    setDirty(changed);
    if (!changed || blocked.current) return;
    setStatus("Unsaved changes");
    const timer = setTimeout(() => void flush(), 700);
    return () => clearTimeout(timer);
  }, [payload, title, ready, owner, flush]);
  useEffect(() => {
    const leaving = (event: BeforeUnloadEvent) => {
      if (encode() !== baseline.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const navigate = (event: MouseEvent) => {
      const a = (event.target as Element)?.closest?.("a");
      if (
        !a ||
        a.target ||
        a.download ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        encode() === baseline.current
      )
        return;
      const url = new URL(a.href);
      if (url.origin !== location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      void flush().then((ok) => {
        if (ok) location.assign(a.href);
      });
    };
    window.addEventListener("beforeunload", leaving);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", leaving);
      document.removeEventListener("click", navigate, true);
    };
  }, [flush]);
  const open = async (id: string) => {
    if (!(await flush())) return;
    const generation = epoch.current;
    try {
      const response = await authFetch(
        `/api/workspaces?id=${encodeURIComponent(id)}`,
      );
      const data = await response.json();
      if (generation !== epoch.current) return;
      if (!response.ok) throw new Error(data.error);
      epoch.current++;
      install(data.workspace);
      publishId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open work.");
    }
  };
  const fresh = async (copy = false) => {
    if (!copy && !(await flush())) return;
    epoch.current++;
    const previous = current.current;
    install(null);
    publishId("");
    if (copy) {
      setPayload(previous.payload);
      setTitle(`${previous.title.slice(0, 145)} (copy)`);
    }
  };
  const remove = async () => {
    if (!identity.current.revision) return;
    if (!window.confirm("Delete this workspace and its saved history?")) return;
    if (!(await flush())) return;
    const generation = epoch.current;
    const response = await authFetch("/api/workspaces", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(identity.current),
    });
    const data = await response.json();
    if (generation !== epoch.current) return;
    if (!response.ok) {
      setError(data.error);
      return;
    }
    epoch.current++;
    const next = epoch.current;
    install(null);
    publishId("");
    const rows = await refresh();
    if (next === epoch.current) setEntries(rows);
  };
  const retry = () => {
    if (status === "Could not load saved work") {
      window.location.reload();
      return;
    }
    blocked.current = false;
    void flush();
  };
  const restore = async (snapshot: WorkspacePayload) => {
    if (await flush()) setPayload(snapshot);
  };
  return {
    applicationId,
    payload,
    setPayload,
    title,
    setTitle,
    entries,
    status,
    error,
    dirty,
    ready,
    id: identity.current.id,
    revision: identity.current.revision,
    flush,
    open,
    fresh,
    remove,
    retry,
    restore,
    owner,
  };
}
export type CareerWorkspace = ReturnType<typeof useCareerWorkspace>;
