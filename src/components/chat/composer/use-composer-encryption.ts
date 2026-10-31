import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import { resolveEncryptionAttention } from "#/lib/omemo/attention";
import type { OmemoContextValue } from "#/providers/omemo-provider";

interface ComposerEncryptionOptions {
	jid: string;
	isDirect: boolean;
	omemo: OmemoContextValue;
	stagedCount: number;
	clearStaged: () => void;
	setBody: (body: string) => void;
}

/** Per-composer OMEMO toggle, attention state, and insecure-send fallback. */
export function useComposerEncryption({
	jid,
	isDirect,
	omemo,
	stagedCount,
	clearStaged,
	setBody,
}: ComposerEncryptionOptions) {
	const [fallbackBody, setFallbackBody] = useState<string | null>(null);
	const encryptionEnabled = isDirect && omemo.isEncryptionEnabled(jid);
	const encryptionIntended = isDirect && omemo.isEncryptionIntended(jid);
	const encryptionAttention = resolveEncryptionAttention(
		isDirect,
		encryptionIntended,
		omemo.status,
	);

	const toggleEncryption = useCallback(() => {
		if (!isDirect) return;
		if (!encryptionEnabled && stagedCount > 0) {
			clearStaged();
			toast("Attachments were removed because encryption is on.", {
				id: "omemo-attachments",
			});
		}
		omemo.setEncryptionEnabled(jid, !encryptionEnabled);
	}, [clearStaged, encryptionEnabled, isDirect, jid, omemo, stagedCount]);

	const sendUnencryptedFallback = useCallback(async () => {
		if (!fallbackBody) return;
		const message = await omemo.sendUnencrypted(jid, fallbackBody);
		if (message) {
			setBody("");
			setFallbackBody(null);
		}
	}, [fallbackBody, jid, omemo, setBody]);

	return {
		encryptionEnabled,
		encryptionAttention,
		fallbackBody,
		setFallbackBody,
		toggleEncryption,
		sendUnencryptedFallback,
	};
}
