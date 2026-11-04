"use client";

import { useState } from "react";
import type { AttemptResponse, QuickPayload } from "@/lib/challenge";
import { SubmitButton } from "./SubmitButton";

export function QuickChallenge({ payload, onSubmit, busy }: { payload: QuickPayload; onSubmit: (r: AttemptResponse) => void; busy: boolean }) {
  const [choice, setChoice] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (choice) onSubmit({ choice });
      }}
    >
      <p className="max-w-[65ch] text-lg">{payload.scenario}</p>

      <fieldset className="mt-6">
        <legend className="font-semibold">{payload.question}</legend>
        <div className="mt-3 flex flex-col gap-2">
          {payload.options.map((o) => (
            <label
              key={o.id}
              className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg bg-surface px-4 py-3 ring-1 ring-line transition-colors hover:bg-surface-hi has-[:checked]:bg-cyan/10 has-[:checked]:ring-2 has-[:checked]:ring-cyan has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan"
            >
              <input
                type="radio"
                name="choice"
                value={o.id}
                checked={choice === o.id}
                onChange={() => setChoice(o.id)}
                className="mt-1 size-4 shrink-0 accent-cyan"
              />
              <span>{o.text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <SubmitButton disabled={!choice} busy={busy}>
        Responder
      </SubmitButton>
    </form>
  );
}
