export type StagedKind = "image" | "video" | "audio" | "file";

export interface StagedFile {
	id: string;
	file: File;
	kind: StagedKind;
	previewUrl: string | null;
	progress?: number;
	uploading?: boolean;
}

export interface MessageAttachment {
	id: string;
	url: string;
	name: string;
	kind: StagedKind;
	mimeType?: string;
	size?: number;
}

export interface UploadService {
	jid: string;
	maxSize?: number;
}

export interface UploadSlot {
	download: string;
	upload: {
		url: string;
		headers?: Array<{ name: string; value: string }>;
	};
}

export interface AttachmentUploader {
	upload(
		file: File,
		onProgress?: (percent: number) => void,
	): Promise<MessageAttachment>;
}
