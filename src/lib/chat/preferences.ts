import type { ChatPreference } from "#/types/chat-ui";

const STORAGE_PREFIX = "avio.chat.preferences.v1";

export const DEFAULT_CHAT_PREFERENCE: ChatPreference = {
	pinned: false,
	muted: false,
	favorite: false,
	archived: false,
};

export function loadChatPreferences(
	accountJid: string | null,
): Record<string, ChatPreference> {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.localStorage.getItem(storageKey(accountJid));
		if (!raw) return {};
		const parsed: unknown = JSON.parse(raw);
		if (!isPreferenceMap(parsed)) return {};
		return parsed;
	} catch {
		return {};
	}
}

export function saveChatPreferences(
	accountJid: string | null,
	preferences: Record<string, ChatPreference>,
) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			storageKey(accountJid),
			JSON.stringify(preferences),
		);
	} catch {
		// Private browsing or quota errors should not break the chat list.
	}
}

function storageKey(accountJid: string | null): string {
	return `${STORAGE_PREFIX}:${accountJid ?? "guest"}`;
}

function isPreferenceMap(
	value: unknown,
): value is Record<string, ChatPreference> {
	if (typeof value !== "object" || value === null) return false;
	return Object.values(value).every(isPreference);
}

function isPreference(value: unknown): value is ChatPreference {
	if (typeof value !== "object" || value === null) return false;
	const preference = value as ChatPreference;
	return (
		typeof preference.pinned === "boolean" &&
		typeof preference.muted === "boolean" &&
		typeof preference.favorite === "boolean" &&
		typeof preference.archived === "boolean"
	);
}
