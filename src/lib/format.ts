const ID = "id-ID";

/**
 * Indonesian short scale: rb (ribu), jt (juta), M (miliar), T (triliun).
 * Used everywhere a full rupiah figure would blow out a chart axis or tile.
 */
export function compactIdr(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const round = (n: number) => (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2));

  if (abs >= 1e12) return `${sign}Rp ${round(abs / 1e12)} T`;
  if (abs >= 1e9) return `${sign}Rp ${round(abs / 1e9)} M`;
  if (abs >= 1e6) return `${sign}Rp ${round(abs / 1e6)} jt`;
  if (abs >= 1e3) return `${sign}Rp ${round(abs / 1e3)} rb`;
  return `${sign}Rp ${abs.toFixed(0)}`;
}

export function fullIdr(value: number): string {
  return `Rp ${new Intl.NumberFormat(ID, { maximumFractionDigits: 0 }).format(Math.round(value))}`;
}

export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}M`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}jt`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}rb`;
  return new Intl.NumberFormat(ID).format(value);
}

export function fullNumber(value: number): string {
  return new Intl.NumberFormat(ID).format(Math.round(value));
}

export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** `2026-03` → `Mar '26` */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const idx = Number(month) - 1;
  if (Number.isNaN(idx) || !MONTHS[idx]) return key;
  return `${MONTHS[idx]} '${year.slice(2)}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function truncate(text: string, max = 48): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
