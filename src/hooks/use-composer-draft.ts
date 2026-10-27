import { useCallback, useEffect, useState } from "react";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";
import { clearDraft, draftKey, readDraft, writeDraft } from "#/lib/chat/drafts";

export function useComposerDraft(jid: string) {
	const state = useXmppState();
	const account = state.account?.bareJid ?? "local";
	const key = draftKey(account, jid);
	const [draft, setDraftState] = useState(() => readDraft(key));

	useEffect(() => {
		setDraftState(readDraft(key));
	}, [key]);

	const setDraft = useCallback(
		(value: string) => {
			setDraftState(value);
			writeDraft(key, value);
		},
		[key],
	);

	const resetDraft = useCallback(() => {
		setDraftState("");
		clearDraft(key);
	}, [key]);

	return { draft, setDraft, resetDraft };
}
