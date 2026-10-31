import type { RefObject } from "react";
import { useCallback, useEffect } from "react";
import type { OmemoAccount } from "#/lib/omemo/account";
import { omemoErrorMessage } from "#/lib/omemo/errors";
import type { OmemoAccountStatus } from "#/types/omemo";
import type { XmppStore } from "#/types/store";

/**
 * Retries encrypted placeholders once OMEMO is ready or a device is trusted.
 * The ciphertext envelope is kept on the message only while decryption is
 * blocked, so a successful retry also drops the retained envelope.
 */
export function useOmemoRetryMessages({
	accountJid,
	accountRef,
	status,
	store,
}: {
	accountJid: string | null;
	accountRef: RefObject<OmemoAccount | null>;
	status: OmemoAccountStatus;
	store: XmppStore;
}): () => Promise<void> {
	const retry = useCallback(async () => {
		if (status !== "ready" || !accountJid) return;
		const account = accountRef.current;
		if (!account) return;

		const messages = Object.values(store.getState().conversations)
			.flatMap((conversation) => conversation.messages)
			.filter(
				(message) =>
					message.encrypted &&
					Boolean(message.decryptionError) &&
					Boolean(message.omemoEnvelope),
			);
		for (const message of messages) {
			if (!message.omemoEnvelope) return;
			const outgoing = message.direction === "outgoing";
			try {
				const decrypted = await account.decrypt(
					message.from,
					message.omemoEnvelope,
				);
				if (!decrypted.trusted && !outgoing) {
					store.addMessage({
						...message,
						trusted: false,
						decryptionError:
							"Encrypted from an unverified device. Verify it in contact info before reading.",
					});
					continue;
				}
				store.addMessage({
					...message,
					body: decrypted.plaintext,
					trusted: true,
					decryptionError: undefined,
					omemoEnvelope: undefined,
				});
			} catch (cause) {
				store.addMessage({
					...message,
					decryptionError: omemoErrorMessage(
						cause,
						"This encrypted message could not be decrypted.",
					),
				});
			}
		}
	}, [accountJid, accountRef, status, store]);

	useEffect(() => {
		void retry();
	}, [retry]);

	return retry;
}
