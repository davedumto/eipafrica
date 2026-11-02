import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AuthForm from "./AuthForm";

export const instant = false;

function safeNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  // Only accept same-origin relative paths — never an absolute URL or a
  // protocol-relative "//evil.example.com", which browsers treat as absolute.
  if (!next.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; tab?: string; reset?: string }>;
}) {
  const { next, tab, reset } = await searchParams;
  const session = await auth();
  const target = safeNext(next) ?? "/";

  if (session?.user?.id) {
    redirect(target);
  }

  return <AuthForm initialTab={tab === "signup" ? "signup" : "login"} next={safeNext(next)} justReset={reset === "1"} />;
}
