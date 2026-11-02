import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import OnboardingForm from "./OnboardingForm";

export const instant = false;

function safeNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    const onboardingTarget = next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding";
    redirect(`/login?next=${encodeURIComponent(onboardingTarget)}`);
  }

  const target = safeNext(next);
  // A brand-new user signing up from an org invite link joins that
  // organization directly instead of being forced to create their own —
  // skip the "create an org" step and send them straight to accept it.
  if (target?.startsWith("/invite/accept")) {
    redirect(target);
  }

  return <OnboardingForm next={target} />;
}
