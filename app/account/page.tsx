import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import DashboardNav from "@/app/dashboard/DashboardNav";
import AccountForm from "./AccountForm";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/account");
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) {
    redirect("/login?next=/account");
  }
  const emailAlertsEnabled = user.emailAlertsEnabled;

  return (
    <div className="appshell">
      <AppBar />
      <div className="obrowse">
        <DashboardNav active="account" />
        <main className="obrowse-main">
          <p className="eyebrow">DASHBOARD</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(28px,3.4vw,38px)" }}>Account settings</h1>
          <p style={{ marginTop: 10, color: "var(--on-bone-faint)" }}>
            Update your name, email and password.
          </p>

          <AccountForm
            firstName={user.firstName ?? ""}
            lastName={user.lastName ?? ""}
            email={user.email}
            emailAlertsEnabled={emailAlertsEnabled}
          />
        </main>
      </div>
    </div>
  );
}
