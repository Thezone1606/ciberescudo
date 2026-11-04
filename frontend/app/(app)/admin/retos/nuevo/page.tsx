"use client";

import { ChallengeForm } from "@/components/admin/ChallengeForm";
import { emptyForm } from "@/lib/admin";

export default function NewChallengePage() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Nuevo reto</h2>
      <ChallengeForm initial={emptyForm("phishing")} />
    </div>
  );
}
