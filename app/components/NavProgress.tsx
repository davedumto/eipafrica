"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin amber progress bar at the top of the viewport, shown while an
 * in-app navigation (Link click or router.push) is in flight — e.g. toggling
 * an Opportunities filter, which triggers a server refetch. Listens for
 * same-origin link clicks to start, and clears once the new route commits
 * (pathname or search params change).
 */
export default function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const prevKeyRef = useRef(routeKey);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const nextKey = `${url.pathname}?${url.searchParams.toString()}`;
      if (nextKey === routeKey) return;
      start();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  function start() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActive(true);
  }

  useEffect(() => {
    if (prevKeyRef.current !== routeKey) {
      prevKeyRef.current = routeKey;
      setActive(false);
    }
  }, [routeKey]);

  // Also catch router.push() calls that don't come from a click (e.g. Select
  // components navigating programmatically) by exposing a global starter.
  useEffect(() => {
    (window as unknown as { __navProgressStart?: () => void }).__navProgressStart = start;
    return () => {
      delete (window as unknown as { __navProgressStart?: () => void }).__navProgressStart;
    };
  }, []);

  if (!active) return null;

  return (
    <div className="navprogress" role="status" aria-label="Loading">
      <div className="navprogress-bar" />
    </div>
  );
}

export function startNavProgress() {
  (window as unknown as { __navProgressStart?: () => void }).__navProgressStart?.();
}
