import { getKind } from "#/lib/chat/attachments";
import type { AttachmentUploader, UploadSlot } from "#/types/attachment";
import type { XmppAdapter } from "#/types/store";

export function createAttachmentUploader(
	adapter: XmppAdapter,
): AttachmentUploader {
	return {
		async upload(file, onProgress) {
			let service: Awaited<ReturnType<typeof adapter.getUploadService>>;
			try {
				service = await adapter.getUploadService();
			} catch {
				throw new Error("This XMPP server does not support file uploads.");
			}

			if (service.maxSize && file.size > service.maxSize) {
				throw new Error(
					`${file.name} is larger than the server's ${formatSize(service.maxSize)} limit.`,
				);
			}

			const slot = await adapter.getUploadSlot(service.jid, {
				name: file.name,
				size: file.size,
				mediaType: file.type || undefined,
			});

			await putFile(file, slot, onProgress);
			onProgress?.(100);

			return {
				id: crypto.randomUUID(),
				url: slot.download,
				name: file.name,
				kind: getKind(file),
				mimeType: file.type || undefined,
				size: file.size,
			};
		},
	};
}

function putFile(
	file: File,
	slot: UploadSlot,
	onProgress?: (percent: number) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = new XMLHttpRequest();
		request.open("PUT", slot.upload.url);
		for (const header of slot.upload.headers ?? []) {
			request.setRequestHeader(header.name, header.value);
		}

		request.upload.onprogress = (event) => {
			if (event.lengthComputable) {
				onProgress?.((event.loaded / event.total) * 100);
			}
		};

		request.onload = () => {
			if (request.status >= 200 && request.status < 300) {
				resolve();
			} else {
				reject(new Error(`Upload failed with status ${request.status}.`));
			}
		};
		request.onerror = () => reject(new Error("The upload connection failed."));
		request.onabort = () => reject(new Error("The upload was cancelled."));
		request.send(file);
	});
}

function formatSize(bytes: number): string {
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
