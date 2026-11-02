"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import NotificationBell from "./NotificationBell";

const LINKS = [
  { href: "#journey", label: "Sectors" },
  { href: "#opportunities", label: "Opportunities", route: "/opportunities" },
  { href: "#organizations", label: "Organizations", route: "/organizations" },
  { href: "#how", label: "How it works" },
  { href: "#trust", label: "Trust" },
];

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export default function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Among sections currently intersecting the "active band" near the
        // top of the viewport, pick the one closest to it (most likely what
        // the user is actually reading).
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActiveSection(topMost.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <header className={`top${solid ? " solid" : ""}`} id="top">
      <div className="in">
        <div className="nav">
          <a className="logo" href="#hero" aria-label="EIP Africa home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f0b34a" strokeWidth="1.5" aria-hidden="true">
              <rect x="2.75" y="2.75" width="18.5" height="18.5" />
              <path d="M2.75 21.25 21.25 2.75" />
              <path d="M12 12v9.25" />
            </svg>
            <span>EIP Africa</span>
          </a>
          <nav className="links" aria-label="Primary">
            {LINKS.map((l) =>
              l.route ? (
                <Link key={l.href} href={l.route}>
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.href}
                  href={l.href}
                  className={activeSection === l.href.slice(1) ? "on" : ""}
                  aria-current={activeSection === l.href.slice(1) ? "location" : undefined}
                >
                  {l.label}
                </a>
              )
            )}
          </nav>
          <div className="nav-r">
            <Link className="btn-ghost" href="/listings/new">
              Post an opportunity
            </Link>
            {status === "authenticated" && session?.user?.id ? (
              <>
                <NotificationBell userId={session.user.id} />
                <Link className="avatar-trigger" href="/account" aria-label="Account settings">
                  <span className="avatar-circle">{initials(session.user.name)}</span>
                </Link>
                <button className="login" onClick={() => signOut({ callbackUrl: "/" })}>
                  Log out
                </button>
              </>
            ) : (
              <Link className="login" href="/login">
                Log in
              </Link>
            )}
            <button
              className="menu-btn"
              id="menubtn"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mnav"
              onClick={() => setOpen((o) => !o)}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M3 7h16M3 15h16" />
              </svg>
            </button>
          </div>
        </div>
        <nav className={`mnav${open ? " open" : ""}`} id="mnav" aria-label="Mobile">
          {LINKS.map((l) =>
            l.route ? (
              <Link key={l.href} href={l.route} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            )
          )}
          <Link href="/listings/new" onClick={() => setOpen(false)}>
            Post an opportunity
          </Link>
          {status === "authenticated" ? (
            <button
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: "/" });
              }}
            >
              Log out
            </button>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)}>
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
