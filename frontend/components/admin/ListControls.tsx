import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

const btn =
  "flex size-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors enabled:hover:bg-surface-hi enabled:hover:text-text disabled:opacity-30";

/** Subir, bajar y quitar un elemento de una lista editable. */
export function ListControls({
  label,
  index,
  length,
  onMove,
  onRemove,
  canRemove = true,
  reorder = true,
}: {
  label: string;
  index: number;
  length: number;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  canRemove?: boolean;
  reorder?: boolean;
}) {
  return (
    <div className="flex shrink-0">
      {reorder && (
        <>
          <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Subir ${label}`}>
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button type="button" className={btn} disabled={index === length - 1} onClick={() => onMove(1)} aria-label={`Bajar ${label}`}>
            <ArrowDown size={16} aria-hidden="true" />
          </button>
        </>
      )}
      <button type="button" className={btn} disabled={!canRemove} onClick={onRemove} aria-label={`Quitar ${label}`}>
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
