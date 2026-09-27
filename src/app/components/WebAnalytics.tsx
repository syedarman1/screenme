"use client";

import { Analytics } from "@vercel/analytics/next";
import { filterPageView } from "../lib/webAnalytics";

export default function WebAnalytics() {
  return <Analytics beforeSend={filterPageView} />;
}
