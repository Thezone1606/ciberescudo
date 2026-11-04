import type { ReactNode } from "react";

export function SubmitButton({
  children,
  busy,
  disabled,
  onClick,
  variant = "primary",
  spaced = true,
}: {
  children: ReactNode;
  busy: boolean;
  disabled?: boolean;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  /** Margen superior propio; se desactiva cuando el botón va dentro de un grupo con su propio espaciado. */
  spaced?: boolean;
}) {
  const style =
    variant === "primary"
      ? "bg-cyan text-ink enabled:hover:bg-cyan/90"
      : "bg-surface text-text ring-1 ring-line enabled:hover:bg-surface-hi";
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={disabled || busy}
      className={`${spaced ? "mt-6 " : ""}min-h-12 rounded-lg px-6 font-semibold transition-[transform,background-color,opacity] duration-150 enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${style}`}
    >
      {busy ? "Enviando…" : children}
    </button>
  );
}
