import type { RefObject } from "react";
import { toast } from "react-hot-toast";
import {
	type EncryptionAttention,
	encryptionAttentionCopy,
} from "#/lib/omemo/attention";
import type { OmemoContextValue } from "#/providers/omemo-provider";
import type { StagedFile } from "#/types/attachment";
import type { ChatMessage } from "#/types/chat";
import type { XmppStore } from "#/types/store";

export type ComposerSendFilesHandler = (
	files: File[],
	caption: string,
	onProgress?: (index: number, percent: number) => void,
) => void | Promise<void>;

interface ComposerSendOptions {
	jid: string;
	encryptionEnabled: boolean;
	encryptionAttention: EncryptionAttention | null;
	omemo: OmemoContextValue;
	actions: XmppStore;
	staged: StagedFile[];
	onSendFiles?: ComposerSendFilesHandler;
	markUploading: () => void;
	resetUploading: () => void;
	clear: () => void;
	setProgress: (index: number, percent: number) => void;
	body: string;
	setBody: (body: string) => void;
	setFallbackBody: (body: string | null) => void;
	contextActive: boolean;
	replyTo: ChatMessage | null;
	editing?: ChatMessage | null;
	onContextDone?: () => void;
	draftBeforeEdit: RefObject<string>;
}

/**
 * Builds the sender used by the composer form. Encrypted sends require a ready
 * OMEMO session; anything else falls through to the plain send path
 * (attachments or text).
 */
export function createComposerSend(options: ComposerSendOptions): () => void {
	return async () => {
		const {
			jid,
			encryptionEnabled,
			encryptionAttention,
			omemo,
			actions,
			staged,
			onSendFiles,
			markUploading,
			resetUploading,
			clear,
			setProgress,
			body,
			setBody,
			setFallbackBody,
			contextActive,
			replyTo,
			editing,
			onContextDone,
			draftBeforeEdit,
		} = options;

		if (encryptionAttention) {
			toast.error(encryptionAttentionCopy(encryptionAttention), {
				id: "omemo-send",
			});
			return;
		}

		if (encryptionEnabled) {
			if (contextActive) {
				toast.error("Encrypted replies and edits are not available yet.", {
					id: "omemo-context",
				});
				return;
			}
			if (omemo.status !== "ready") {
				toast.error(
					"Unlock OMEMO in Security settings to send encrypted messages.",
					{ id: "omemo-send" },
				);
				return;
			}
			const result = await omemo.sendMessage(jid, body);
			if (result.message) {
				setBody("");
				return;
			}
			if (result.error === "no-recipients") {
				setFallbackBody(body);
			}
			return;
		}

		if (staged.length > 0 && onSendFiles && !contextActive) {
			markUploading();
			try {
				await onSendFiles(
					staged.map((item) => item.file),
					body,
					setProgress,
				);
				clear();
				setBody("");
				onContextDone?.();
				draftBeforeEdit.current = "";
			} catch {
				resetUploading();
			}
			return;
		}

		if (!body) return;

		const contextOptions = editing
			? { editId: editing.id }
			: replyTo
				? { replyTo: { id: replyTo.id, to: replyTo.from } }
				: undefined;
		void actions.sendMessage(jid, body, undefined, contextOptions);
		setBody("");
		draftBeforeEdit.current = "";
		onContextDone?.();
	};
}

interface ComposerPlaceholderInput {
	disabled: boolean;
	stagedCount: number;
	replyTo: ChatMessage | null;
	editing?: ChatMessage | null;
}

/** Placeholder text for the composer's textarea. */
export function composerPlaceholder({
	disabled,
	stagedCount,
	replyTo,
	editing,
}: ComposerPlaceholderInput): string {
	if (disabled) return "Reconnect to send messages";
	if (editing) return "Edit message";
	if (replyTo) return "Write a reply";
	if (stagedCount > 0) return "Add a caption";
	return "Write a message";
}
