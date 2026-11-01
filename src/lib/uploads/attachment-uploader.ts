import { getKind } from "#/lib/chat/attachments";
import { isDesktopShell } from "#/lib/platform/desktop-shell";
import type { AttachmentUploader, UploadSlot } from "#/types/attachment";
import type { XmppAdapter } from "#/types/store";

const NO_SERVICE_PATTERN = /no upload service discovered/i;

/** Turns discovery failures into a message that names the actual cause. */
export function uploadServiceErrorMessage(error: unknown): string {
	const detail = error instanceof Error ? error.message : "";
	if (NO_SERVICE_PATTERN.test(detail)) {
		return "This server does not advertise file uploads (XEP-0363). Enable the upload component under this account's domain.";
	}
	return detail || "The file upload service could not be discovered.";
}

/**
 * Upload and download URLs must use HTTPS: the app runs in a secure context,
 * so plain http:// URLs are blocked by mixed-content rules and the CSP.
 */
export function insecureServiceUrlMessage(
	uploadUrl: string,
	downloadUrl: string,
): string | null {
	const insecure = [uploadUrl, downloadUrl].find((url) =>
		url.startsWith("http://"),
	);
	if (!insecure) return null;
	if (typeof window === "undefined") return null;
	const secure = isDesktopShell() || window.location.protocol === "https:";
	if (!secure) return null;
	return "The upload service returned an insecure http:// URL, which this app blocks. Configure the server's public upload URL as https://.";
}

export function uploadFailureMessage(status: number): string {
	if (status === 404) {
		return "Upload failed with status 404: the upload endpoint is not reachable. Check that the reverse proxy routes the upload path to the server.";
	}
	if (status === 413) {
		return "Upload failed with status 413: the server rejected the file as too large.";
	}
	return `Upload failed with status ${status}.`;
}

export function createAttachmentUploader(
	adapter: XmppAdapter,
): AttachmentUploader {
	return {
		async upload(file, onProgress) {
			let service: Awaited<ReturnType<typeof adapter.getUploadService>>;
			try {
				service = await adapter.getUploadService();
			} catch (error) {
				throw new Error(uploadServiceErrorMessage(error));
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

			const blocked = insecureServiceUrlMessage(slot.upload.url, slot.download);
			if (blocked) throw new Error(blocked);

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
				reject(new Error(uploadFailureMessage(request.status)));
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
