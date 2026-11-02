"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import NotificationBell from "./NotificationBell";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export default function AppBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="appbar">
      <div className="in">
        <div className="nav">
          <Link className="logo" href="/" aria-label="EIP Africa home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f0b34a" strokeWidth="1.5" aria-hidden="true">
              <rect x="2.75" y="2.75" width="18.5" height="18.5" />
              <path d="M2.75 21.25 21.25 2.75" />
              <path d="M12 12v9.25" />
            </svg>
            <span>EIP Africa</span>
          </Link>
          <nav className="links" aria-label="Primary">
            <Link href="/opportunities" className={isActive("/opportunities") ? "on" : ""} aria-current={isActive("/opportunities") ? "page" : undefined}>
              Opportunities
            </Link>
            <Link href="/organizations" className={isActive("/organizations") ? "on" : ""} aria-current={isActive("/organizations") ? "page" : undefined}>
              Organizations
            </Link>
            {status === "authenticated" && (
              <>
                <Link
                  href="/dashboard/listings"
                  className={isActive("/dashboard") ? "on" : ""}
                  aria-current={isActive("/dashboard") ? "page" : undefined}
                >
                  Dashboard
                </Link>
                <Link
                  href="/messages"
                  className={isActive("/messages") ? "on" : ""}
                  aria-current={isActive("/messages") ? "page" : undefined}
                >
                  Messages
                </Link>
                {session?.user?.isAdmin && (
                  <Link href="/admin" className={isActive("/admin") ? "on" : ""} aria-current={isActive("/admin") ? "page" : undefined}>
                    Admin
                  </Link>
                )}
              </>
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
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="appbar-mnav"
              onClick={() => setOpen((o) => !o)}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M3 7h16M3 15h16" />
              </svg>
            </button>
          </div>
        </div>
        <nav className={`mnav${open ? " open" : ""}`} id="appbar-mnav" aria-label="Mobile">
          <Link href="/opportunities" onClick={() => setOpen(false)}>
            Opportunities
          </Link>
          <Link href="/organizations" onClick={() => setOpen(false)}>
            Organizations
          </Link>
          {status === "authenticated" && (
            <>
              <Link href="/dashboard/listings" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <Link href="/messages" onClick={() => setOpen(false)}>
                Messages
              </Link>
              {session?.user?.isAdmin && (
                <Link href="/admin" onClick={() => setOpen(false)}>
                  Admin
                </Link>
              )}
              <Link href="/account" onClick={() => setOpen(false)}>
                Account settings
              </Link>
            </>
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
