import { useCallback, useEffect, useState } from "react";
import {
	DEFAULT_CHAT_PREFERENCE,
	loadChatPreferences,
	saveChatPreferences,
} from "#/lib/chat/preferences";
import type { ChatPreference } from "#/types/chat-ui";

export function useChatPreferences(accountJid: string | null) {
	const [preferences, setPreferences] = useState(() =>
		loadChatPreferences(accountJid),
	);

	useEffect(() => {
		saveChatPreferences(accountJid, preferences);
	}, [accountJid, preferences]);

	const getPreference = useCallback(
		(jid: string): ChatPreference =>
			preferences[jid] ?? DEFAULT_CHAT_PREFERENCE,
		[preferences],
	);

	const updatePreference = useCallback(
		(jid: string, patch: Partial<ChatPreference>) => {
			setPreferences((current) => ({
				...current,
				[jid]: {
					...(current[jid] ?? DEFAULT_CHAT_PREFERENCE),
					...patch,
				},
			}));
		},
		[],
	);

	return { getPreference, updatePreference };
}
