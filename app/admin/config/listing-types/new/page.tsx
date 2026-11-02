import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppBar from "@/app/components/AppBar";
import ListingTypeForm from "@/app/admin/config/ListingTypeForm";

export const instant = false;

export default async function NewListingTypePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin/config/listing-types/new");
  if (!session.user.isAdmin) redirect("/opportunities");

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">ADMIN</p>
          <h1 style={{ marginTop: 14, marginBottom: 32, fontSize: "clamp(32px,4vw,44px)" }}>New listing type</h1>
          <ListingTypeForm mode="create" />
        </div>
      </main>
    </div>
  );
}
