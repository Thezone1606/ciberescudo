export function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta;
  if (to < 0 || to >= list.length) return list;
  const out = [...list];
  [out[index], out[to]] = [out[to], out[index]];
  return out;
}

export const removeAt = <T,>(list: T[], index: number): T[] => list.filter((_, i) => i !== index);
export const replaceAt = <T,>(list: T[], index: number, value: T): T[] => list.map((v, i) => (i === index ? value : v));
