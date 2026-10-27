import type { PresenceShow, PresenceState } from "#/types/xmpp";

export const OFFLINE_PRESENCE: PresenceState = {
	show: "offline",
	priority: 0,
};

export interface PresenceInput {
	show?: string;
	status?: string;
	priority?: number;
	delay?: { timestamp?: Date | string };
	available?: boolean;
}

export function pickBestPresence(presences: PresenceState[]): PresenceState {
	const rank: Record<PresenceShow, number> = {
		chat: 5,
		available: 4,
		away: 3,
		dnd: 2,
		xa: 1,
		offline: 0,
	};
	let best = OFFLINE_PRESENCE;
	for (const presence of presences) {
		if (rank[presence.show] > rank[best.show]) best = presence;
	}
	return best;
}

export function normalizePresence(input: PresenceInput = {}): PresenceState {
	if (input.available === false) {
		return {
			...OFFLINE_PRESENCE,
			lastSeen: toTimestamp(input.delay?.timestamp) ?? Date.now(),
		};
	}

	const show = toShow(input.show);
	return {
		show,
		status: input.status?.trim() || undefined,
		priority: input.priority ?? 0,
	};
}

function toShow(show?: string): PresenceShow {
	switch (show) {
		case "chat":
		case "away":
		case "dnd":
		case "xa":
			return show;
		default:
			return "available";
	}
}

export function presenceLabel(presence: PresenceState): string {
	switch (presence.show) {
		case "chat":
			return "Free to chat";
		case "available":
			return "Online";
		case "away":
			return "Away";
		case "dnd":
			return "Do not disturb";
		case "xa":
			return "Extended away";
		default:
			return "Offline";
	}
}

function toTimestamp(value?: Date | string): number | undefined {
	if (!value) return undefined;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date.getTime();
}
