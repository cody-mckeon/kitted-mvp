"use client";

type EventProperties = Record<string, string | number>;

declare global {
  interface Window { dataLayer?: Array<Record<string, unknown>> }
}

export function track(event: string, properties: EventProperties) {
  const detail = { event, ...properties };
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(detail);
  window.dispatchEvent(new CustomEvent("kitted:analytics", { detail }));
}

export function deviceContext() {
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}
