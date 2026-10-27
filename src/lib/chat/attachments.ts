import type { StagedKind } from "#/types/attachment";

export function getKind(file: File): StagedKind {
	if (file.type.startsWith("image/")) return "image";
	if (file.type.startsWith("video/")) return "video";
	return "file";
}

const IMAGE_EXTENSIONS = /[.](png|jpe?g|gif|webp|avif|heic|bmp|svg)$/i;
const VIDEO_EXTENSIONS = /[.](mp4|webm|mov|m4v|avi|mkv)$/i;

export function kindFromName(name: string, mimeType?: string): StagedKind {
	if (mimeType?.startsWith("image/")) return "image";
	if (mimeType?.startsWith("video/")) return "video";
	if (IMAGE_EXTENSIONS.test(name)) return "image";
	if (VIDEO_EXTENSIONS.test(name)) return "video";
	return "file";
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
