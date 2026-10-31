export function timeAgo(dateLike) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateLike).getTime()) / 1000));
  if (seconds < 45) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateLike).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const fullDate = (dateLike) =>
  new Date(dateLike).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
