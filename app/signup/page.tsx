import { redirect } from "next/navigation";

// /signup is kept as a stable URL but redirects into the unified, tabbed
// auth page at /login (see app/login/page.tsx + AuthForm.tsx), landing on
// its "signup" tab.
export default async function SignupRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const qs = new URLSearchParams({ tab: "signup" });
  if (next) qs.set("next", next);
  redirect(`/login?${qs.toString()}`);
}
