import { requestUsage, type FeatureType, type UsageCheckResult } from "./aiRequest";
export type { FeatureType, UsageCheckResult } from "./aiRequest";

// Entitlement comes from the atomic reservation created by withUsage.
export async function checkUsageLimit(userId: string, feature: FeatureType): Promise<UsageCheckResult> {
  const context = requestUsage.getStore();
  if (!context || context.userId !== userId || context.feature !== feature) throw new Error("A usage reservation is required.");
  return context.usage;
}
