import { normalizeXmppError } from "#/lib/xmpp/errors";
import type { AttachmentUploader, MessageAttachment } from "#/types/attachment";
import type { XmppError } from "#/types/xmpp";

export async function uploadAttachmentWithErrors({
	uploader,
	file,
	onProgress,
	onError,
}: {
	uploader: AttachmentUploader;
	file: File;
	onProgress?: (percent: number) => void;
	onError: (error: XmppError) => void;
}): Promise<MessageAttachment> {
	try {
		return await uploader.upload(file, onProgress);
	} catch (error) {
		const xmppError = normalizeXmppError(error, "send-failed");
		onError(xmppError);
		throw xmppError;
	}
}
