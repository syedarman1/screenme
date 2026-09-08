export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function toError(value: unknown): Error & { status?: number; code?: string } {
  if (value instanceof Error) return value;
  const data = record(value);
  return Object.assign(new Error(typeof data.message === "string" ? data.message : "Something went wrong. Please retry."), {
    status: typeof data.status === "number" ? data.status : undefined,
    code: typeof data.code === "string" ? data.code : undefined,
  });
}
