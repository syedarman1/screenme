export const isOperator = (id: string): boolean =>
  (process.env.SCREENME_OPERATOR_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(id);
