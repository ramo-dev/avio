import { useCallback } from "react";
import { useXmppActions } from "#/hooks/xmpp/use-xmpp";
import type { MessageAttachment } from "#/types/attachment";

export function useSendFiles(jid: string) {
	const actions = useXmppActions();

	return useCallback(
		async (
			files: File[],
			caption: string,
			onProgress?: (index: number, percent: number) => void,
		) => {
			const attachments: MessageAttachment[] = [];
			for (const [index, file] of files.entries()) {
				attachments.push(
					await actions.uploadAttachment(file, (percent) =>
						onProgress?.(index, percent),
					),
				);
			}

			const message = await actions.sendMessage(jid, caption, attachments);
			if (!message) throw new Error("The attachment message was not sent.");
		},
		[actions, jid],
	);
}
