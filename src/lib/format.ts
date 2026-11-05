const dateFormat = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' });

/** "2026-10-28" -> "Oct 28, 2026" */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}

/** Size of a text in bytes, formatted as "4.2 KB". */
export function formatSize(text: string): string {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** ["5.1", "7.x"] -> "5.1 · 7.x" */
export function formatVersions(versions: string[]): string {
  return versions.join(' · ');
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
