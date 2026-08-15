/** Zamíchá pole na místě metodou Fisher–Yates a vrátí novou kopii. */
export function zamichej<T>(pole: T[]): T[] {
  const kopie = [...pole];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

export function formatujDatum(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function noveId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
