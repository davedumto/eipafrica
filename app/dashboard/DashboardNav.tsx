import Link from "next/link";

const TABS = [
  { href: "/dashboard/listings", label: "My listings" },
  { href: "/dashboard/enquiries", label: "My enquiries" },
  { href: "/dashboard/saved", label: "Saved" },
  { href: "/account", label: "Account settings" },
  { href: "/account/organization", label: "Organization" },
] as const;

export default function DashboardNav({
  active,
}: {
  active: "listings" | "enquiries" | "saved" | "account" | "organization";
}) {
  return (
    <aside className="ofilters">
      <div className="ofilters-head">
        <h2>Dashboard</h2>
      </div>
      <div className="grp" style={{ borderBottom: 0 }}>
        <div className="opts">
          {TABS.map((t) => {
            const isActive = t.href.endsWith(active);
            return (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  display: "block",
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--on-bone)" : "var(--on-bone-faint)",
                  background: isActive ? "rgba(16,17,20,0.06)" : "transparent",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
