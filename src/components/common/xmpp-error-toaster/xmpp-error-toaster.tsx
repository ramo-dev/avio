import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import type { XmppError } from "#/types/xmpp";

export function XmppErrorToaster() {
	const state = useXmppState();
	const actions = useXmppActions();
	const error = state.connection.error;
	const shown = useRef<XmppError | null>(null);

	useEffect(() => {
		if (!error || shown.current === error) return;
		shown.current = error;
		toast.error(error.message, { id: error.message });
		actions.clearError();
	}, [actions, error]);

	return null;
}
