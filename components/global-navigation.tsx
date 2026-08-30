"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { deviceContext, track } from "@/lib/analytics";
import { activities } from "@/lib/catalog";
import { useCart } from "@/components/cart-provider";

export function GlobalNavigation() {
  const pathname = usePathname();
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { itemCount, subtotal } = useCart();

  useEffect(() => {
    setDesktopOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function closeMenus(event: KeyboardEvent | MouseEvent) {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && headerRef.current?.contains(event.target as Node)) return;
      setDesktopOpen(false);
      setMobileOpen(false);
    }

    document.addEventListener("keydown", closeMenus);
    document.addEventListener("pointerdown", closeMenus);
    return () => {
      document.removeEventListener("keydown", closeMenus);
      document.removeEventListener("pointerdown", closeMenus);
    };
  }, []);

  function activityLink(activity: (typeof activities)[number], mobile = false) {
    const selected = pathname === `/activities/${activity.slug}`;
    return (
      <Link
        key={activity.slug}
        className={`nav-activity ${selected ? "selected" : ""}`}
        href={`/activities/${activity.slug}`}
        aria-current={selected ? "page" : undefined}
        onClick={() => {
          track("category_selected", {
            category: activity.slug,
            source: "global_navigation",
            device_context: deviceContext(),
          });
          if (mobile) setMobileOpen(false);
          else setDesktopOpen(false);
        }}
      >
        <span className={`nav-activity-mark ${activity.tone}`} aria-hidden="true" />
        <span><strong>{activity.name}</strong><small>{activity.eyebrow}</small></span>
        <b aria-hidden="true">→</b>
      </Link>
    );
  }

  return (
    <header className="site-header" ref={headerRef}>
      <Link className="wordmark" href="/" aria-label="Kitted home">KITTED</Link>

      <nav className="desktop-navigation" aria-label="Main navigation">
        <Link className={pathname === "/" ? "selected" : ""} href="/" aria-current={pathname === "/" ? "page" : undefined}>Home</Link>
        <Link className={pathname === "/search" ? "selected" : ""} href="/search" aria-current={pathname === "/search" ? "page" : undefined}>Search</Link>
        <Link className={pathname === "/build-my-kit" ? "selected" : ""} href="/build-my-kit?entry=global_navigation" aria-current={pathname === "/build-my-kit" ? "page" : undefined}>Build my kit</Link>
        <button
          className="browse-trigger"
          type="button"
          aria-expanded={desktopOpen}
          aria-controls="activity-navigation"
          onClick={() => setDesktopOpen((open) => !open)}
        >
          Shop activities <span aria-hidden="true">⌄</span>
        </button>
      </nav>

      <div className="header-cart" aria-label={`Cart with ${itemCount} items, subtotal $${subtotal.toFixed(2)}`}>
        <span>Cart</span><strong aria-hidden="true">{itemCount}</strong>{itemCount > 0 && <small>${subtotal.toFixed(2)}</small>}
      </div>
      <button
        className="mobile-menu-trigger"
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="mobile-navigation"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        onClick={() => setMobileOpen((open) => !open)}
      ><i /><i /></button>

      {desktopOpen && (
        <div className="activity-navigation" id="activity-navigation">
          <div className="nav-panel-heading"><p className="kicker">Browse the collection</p><h2>Choose your activity</h2></div>
          <div className="nav-activity-grid">{activities.map((activity) => activityLink(activity))}</div>
        </div>
      )}

      {mobileOpen && (
        <nav className="mobile-navigation" id="mobile-navigation" aria-label="Mobile navigation">
          <Link className={pathname === "/" ? "mobile-home selected" : "mobile-home"} href="/" aria-current={pathname === "/" ? "page" : undefined}>Home</Link>
          <Link className={pathname === "/search" ? "mobile-home selected" : "mobile-home"} href="/search" aria-current={pathname === "/search" ? "page" : undefined}>Search gear</Link>
          <Link className={pathname === "/build-my-kit" ? "mobile-home selected" : "mobile-home"} href="/build-my-kit?entry=global_navigation" aria-current={pathname === "/build-my-kit" ? "page" : undefined}>Build my kit</Link>
          <p className="kicker">Shop by activity</p>
          <div>{activities.map((activity) => activityLink(activity, true))}</div>
        </nav>
      )}
    </header>
  );
}
