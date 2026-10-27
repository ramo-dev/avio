import type { ReactNode } from "react";

export function highlightText(
	text: string,
	query: string,
	markClassName: string,
): ReactNode {
	const normalized = query.trim();
	if (!normalized) return text;

	const pattern = new RegExp(`(${escapeRegExp(normalized)})`, "gi");
	const parts = text.split(pattern);
	if (parts.length === 1) return text;

	let offset = 0;
	return parts.map((part) => {
		const key = `${offset}-${part}`;
		offset += part.length;

		return part.toLowerCase() === normalized.toLowerCase() ? (
			<mark key={key} className={`rounded-sm px-0.5 ${markClassName}`}>
				{part}
			</mark>
		) : (
			part
		);
	});
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
