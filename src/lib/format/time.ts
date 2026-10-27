const timeFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "numeric",
	minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	month: "short",
	day: "numeric",
});

export function formatMessageTime(timestamp: number): string {
	return timeFormatter.format(new Date(timestamp));
}

export function formatDayLabel(timestamp: number, now = Date.now()): string {
	const date = new Date(timestamp);
	const today = new Date(now);
	const yesterday = new Date(now);
	yesterday.setDate(today.getDate() - 1);

	if (isSameDay(date, today)) return "Today";
	if (isSameDay(date, yesterday)) return "Yesterday";
	return dayFormatter.format(date);
}

export function formatRelativeTime(
	timestamp: number,
	now = Date.now(),
): string {
	const diff = Math.max(0, now - timestamp);
	const minutes = Math.floor(diff / 60_000);
	if (minutes < 1) return "now";
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	return `${days}d`;
}

export function formatLastSeen(timestamp: number, now = Date.now()): string {
	const diff = Math.max(0, now - timestamp);
	const minutes = Math.floor(diff / 60_000);
	if (minutes < 1) return "last seen just now";
	if (minutes < 60) return `last seen ${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `last seen ${hours}h ago`;
	return `last seen ${dayFormatter.format(new Date(timestamp))}`;
}

export function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}
