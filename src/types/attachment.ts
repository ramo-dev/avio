export type StagedKind = "image" | "video" | "file";

export interface StagedFile {
	id: string;
	file: File;
	kind: StagedKind;
	previewUrl: string | null;
}
