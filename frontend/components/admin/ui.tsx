import type { ReactNode } from "react";

export const inputClass =
  "min-h-11 w-full rounded-lg bg-surface px-3 text-base text-text ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-cyan focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger";

export const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium ring-1 ring-line transition-colors enabled:hover:bg-surface-hi disabled:cursor-not-allowed disabled:opacity-40";

export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan px-5 text-sm font-semibold text-ink transition-[transform,background-color,opacity] duration-150 enabled:hover:bg-cyan/90 enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

/** Campo de formulario: etiqueta, ayuda opcional y el error de validación del servidor, enlazados con aria. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const describedBy = (id: string, error?: string, hint?: string) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);
