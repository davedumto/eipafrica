import { Suspense } from "react";
import AcceptInviteForm from "./AcceptInviteForm";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  );
}
