import { redirect } from "next/navigation";

export const instant = false;

export default function DashboardIndexPage() {
  redirect("/dashboard/listings");
}
