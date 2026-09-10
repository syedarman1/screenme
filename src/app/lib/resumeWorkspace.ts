import { authFetch } from "./authFetch";
import {
  blankWorkspace,
  WORKSPACE_LABELS,
  WORKSPACE_PATHS,
  type WorkspaceKind,
} from "./workspace";

export async function startResumeWorkspace(
  resumeId: string,
  kind: WorkspaceKind,
): Promise<string> {
  const loaded = await authFetch(
    `/api/resumes?id=${encodeURIComponent(resumeId)}`,
  );
  const source = await loaded.json();
  if (!loaded.ok) throw new Error(source.error || "Could not load resume.");
  const response = await authFetch("/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      revision: 0,
      kind,
      title: `${source.resume.name} · ${WORKSPACE_LABELS[kind]}`.slice(0, 160),
      payload: { ...blankWorkspace(), resume: source.resume.content },
    }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Could not start saved work.");
  return `${WORKSPACE_PATHS[kind]}?review=${encodeURIComponent(data.workspace.id)}`;
}
