import type { StagedKind } from "#/types/attachment";

export function getKind(file: File): StagedKind {
	if (file.type.startsWith("image/")) return "image";
	if (file.type.startsWith("video/")) return "video";
	if (file.type.startsWith("audio/")) return "audio";
	return "file";
}

const IMAGE_EXTENSIONS = /[.](png|jpe?g|gif|webp|avif|heic|bmp|svg)$/i;
const VIDEO_EXTENSIONS = /[.](mp4|webm|mov|m4v|avi|mkv)$/i;
const AUDIO_EXTENSIONS = /[.](mp3|m4a|aac|ogg|oga|opus|wav|flac|weba)$/i;

export function kindFromName(name: string, mimeType?: string): StagedKind {
	if (mimeType?.startsWith("image/")) return "image";
	if (mimeType?.startsWith("video/")) return "video";
	if (mimeType?.startsWith("audio/")) return "audio";
	if (IMAGE_EXTENSIONS.test(name)) return "image";
	if (VIDEO_EXTENSIONS.test(name)) return "video";
	if (AUDIO_EXTENSIONS.test(name)) return "audio";
	return "file";
}

const WEB_PROTOCOLS = new Set(["https:", "http:"]);

/**
 * Only http(s) URLs may reach an attachment `href` or `src`. Remote messages
 * control these URLs, so `javascript:`, `data:`, `blob:`, and `file:` are
 * rejected here at the normalization boundary.
 */
export function isSafeAttachmentUrl(url: string): boolean {
	try {
		return WEB_PROTOCOLS.has(new URL(url).protocol);
	} catch {
		return false;
	}
}

export function fileNameFromUrl(url: string): string {
	try {
		const path = new URL(url).pathname;
		const name = path.split("/").filter(Boolean).at(-1);
		return name ? decodeURIComponent(name) : "Attachment";
	} catch {
		return "Attachment";
	}
}

export function formatBytes(bytes?: number): string {
	if (bytes === undefined) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
