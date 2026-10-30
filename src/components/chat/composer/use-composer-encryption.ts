import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import type { OmemoContextValue } from "#/providers/omemo-provider";

interface ComposerEncryptionOptions {
	jid: string;
	isDirect: boolean;
	omemo: OmemoContextValue;
	stagedCount: number;
	clearStaged: () => void;
	setBody: (body: string) => void;
}

/** Per-composer OMEMO toggle and insecure-send fallback state. */
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

	const toggleEncryption = useCallback(() => {
		if (!isDirect) return;
		if (!encryptionEnabled && omemo.status !== "ready") {
			toast.error("Set up and unlock OMEMO in Security settings first.", {
				id: "omemo-toggle",
			});
			return;
		}
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
		fallbackBody,
		setFallbackBody,
		toggleEncryption,
		sendUnencryptedFallback,
	};
}
