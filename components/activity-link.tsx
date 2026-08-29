"use client";

import Link from "next/link";
import { deviceContext, track } from "@/lib/analytics";

export function ActivityLink({ slug, name, eyebrow, tone }: { slug: string; name: string; eyebrow: string; tone: string }) {
  return (
    <Link
      className={`activity-card ${tone}`}
      href={`/activities/${slug}`}
      onClick={() => track("category_selected", { category: slug, source: "homepage", device_context: deviceContext() })}
    >
      <span className="activity-art" aria-hidden="true"><i /><i /><i /></span>
      <span className="activity-copy"><small>{eyebrow}</small><strong>{name}</strong><span>Shop activity <b aria-hidden="true">→</b></span></span>
    </Link>
  );
}
