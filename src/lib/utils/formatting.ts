export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

export function formatPages(pages: number): string {
  if (pages < 1000) {
    return pages.toString();
  }
  
  return `${(pages / 1000).toFixed(1)}k`;
}

export function formatPace(pagesPerHour: number): string {
  return `${Math.round(pagesPerHour)} pages/hr`;
}

export function formatStreak(days: number): string {
  if (days === 1) {
    return "1 day";
  }
  return `${days} days`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map(word => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}