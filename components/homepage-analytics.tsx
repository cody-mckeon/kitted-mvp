"use client";

import { useEffect } from "react";
import { deviceContext, track } from "@/lib/analytics";

export function HomepageAnalytics() {
  useEffect(() => {
    const entrySource = document.referrer ? "referral" : "direct";
    track("homepage_viewed", { entry_source: entrySource, device_context: deviceContext() });
  }, []);
  return null;
}
