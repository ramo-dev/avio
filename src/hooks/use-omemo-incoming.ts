import { type RefObject, useCallback, useEffect } from "react";
import type { OmemoAccount } from "#/lib/omemo/account";
import { omemoErrorMessage } from "#/lib/omemo/errors";
import { createIncomingEncryptedMessage } from "#/lib/omemo/incoming";
import type { XmppEvent, XmppStore } from "#/types/store";

type OmemoMessageEvent = Extract<XmppEvent, { type: "omemo-message" }>;

export function useOmemoIncoming({
	accountRef,
	store,
}: {
	accountRef: RefObject<OmemoAccount | null>;
	store: XmppStore;
}) {
	const handleIncoming = useCallback(
		async (event: OmemoMessageEvent) => {
			const account = accountRef.current;
			const message = createIncomingEncryptedMessage(
				event,
				account?.accountJid ?? "",
			);
			if (!account || account.status !== "ready") {
				store.addMessage({
					...message,
					decryptionError: "Unlock OMEMO to read this message.",
				});
				return;
			}
			const outgoing = event.direction === "outgoing";
			try {
				const decrypted = await account.decrypt(event.from, event.envelope);
				if (!decrypted.trusted && !outgoing) {
					store.addMessage({
						...message,
						trusted: false,
						decryptionError:
							"Encrypted from an unverified device. Verify it in contact info before reading.",
					});
					return;
				}
				if (decrypted.editId) {
					store.applyMessageEdit(
						event.jid,
						decrypted.editId,
						decrypted.plaintext,
					);
					return;
				}
				store.addMessage({
					...message,
					body: decrypted.plaintext,
					replyTo: decrypted.replyTo,
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
		},
		[accountRef, store],
	);

	useEffect(() => {
		return store.subscribeOmemo((event) => {
			void handleIncoming(event);
		});
	}, [handleIncoming, store]);
}
