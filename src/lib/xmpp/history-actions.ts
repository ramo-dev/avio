import { reduceHistory } from "#/lib/xmpp/conversation-state";
import { normalizeXmppError } from "#/lib/xmpp/errors";
import { bareJid } from "#/lib/xmpp/jid";
import type { XmppAdapter, XmppState } from "#/types/store";
import type { XmppError } from "#/types/xmpp";

const HISTORY_PAGE_SIZE = 30;

export async function loadOlderHistory({
	getState,
	setState,
	adapter,
	jid,
	onError,
}: {
	getState: () => XmppState;
	setState: (state: XmppState) => void;
	adapter: XmppAdapter;
	jid: string;
	onError: (error: XmppError) => void;
}): Promise<number> {
	const key = bareJid(jid);
	const initial = getState();
	const conversation = initial.conversations[key];
	if (
		!conversation ||
		conversation.historyLoading ||
		conversation.historyComplete
	) {
		return 0;
	}

	const before = conversation.messages[0]?.timestamp;
	setState({
		...initial,
		conversations: {
			...initial.conversations,
			[key]: { ...conversation, historyLoading: true },
		},
	});

	try {
		const page = await adapter.getHistory(key, before, HISTORY_PAGE_SIZE);
		const latest = getState();
		const current = latest.conversations[key];
		if (!current) return 0;

		const next = reduceHistory(latest, page);
		const merged = next.conversations[key] ?? current;
		const complete =
			page.length < HISTORY_PAGE_SIZE ||
			merged.messages.length === current.messages.length;

		setState({
			...next,
			conversations: {
				...next.conversations,
				[key]: {
					...merged,
					historyLoading: false,
					historyComplete: complete,
				},
			},
		});
		return page.length;
	} catch (error) {
		const latest = getState();
		const current = latest.conversations[key];
		if (current) {
			setState({
				...latest,
				conversations: {
					...latest.conversations,
					[key]: {
						...current,
						historyLoading: false,
						historyComplete: true,
					},
				},
			});
		}
		onError(normalizeXmppError(error, "unknown"));
		return 0;
	}
}
