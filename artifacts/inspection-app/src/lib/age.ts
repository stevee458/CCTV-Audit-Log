export function formatAge(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const from = new Date(dateStr);
  const now = new Date();
  const totalMonths =
    (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (totalMonths < 0) return "—";
  if (totalMonths === 0) return "< 1 mo";
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} mo`;
  if (months === 0) return `${years} yr`;
  return `${years} yr ${months} mo`;
}
