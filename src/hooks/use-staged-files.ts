import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { getKind } from "#/lib/chat/attachments";
import type { StagedFile } from "#/types/attachment";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export function useStagedFiles(canAttach: boolean, onFocus?: () => void) {
	const [staged, setStaged] = useState<StagedFile[]>([]);
	const stagedRef = useRef(staged);

	useEffect(() => {
		stagedRef.current = staged;
	}, [staged]);

	useEffect(
		() => () => {
			for (const item of stagedRef.current) {
				if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
			}
		},
		[],
	);

	const stage = useCallback(
		(files: FileList | File[] | null) => {
			if (!files || !canAttach) return;
			const accepted: StagedFile[] = [];
			let room = MAX_FILES - staged.length;

			for (const file of Array.from(files)) {
				if (file.size > MAX_FILE_SIZE) {
					toast.error(`${file.name} is larger than 25 MB`);
					continue;
				}
				if (room <= 0) {
					toast.error(`You can attach up to ${MAX_FILES} files at a time`);
					break;
				}
				const kind = getKind(file);
				accepted.push({
					id: crypto.randomUUID(),
					file,
					kind,
					previewUrl: kind === "file" ? null : URL.createObjectURL(file),
				});
				room -= 1;
			}

			if (accepted.length === 0) return;
			setStaged((current) => [...current, ...accepted]);
			onFocus?.();
		},
		[canAttach, onFocus, staged.length],
	);

	const unstage = useCallback((id: string) => {
		setStaged((current) => {
			const target = current.find((item) => item.id === id);
			if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
			return current.filter((item) => item.id !== id);
		});
	}, []);

	const clear = useCallback(() => {
		setStaged((current) => {
			for (const item of current) {
				if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
			}
			return [];
		});
	}, []);

	const markUploading = useCallback(() => {
		setStaged((current) =>
			current.map((item) => ({ ...item, uploading: true, progress: 0 })),
		);
	}, []);

	const setProgress = useCallback((index: number, percent: number) => {
		setStaged((current) =>
			current.map((item, itemIndex) =>
				itemIndex === index
					? { ...item, uploading: true, progress: percent }
					: item,
			),
		);
	}, []);

	const resetUploading = useCallback(() => {
		setStaged((current) =>
			current.map((item) => ({
				...item,
				uploading: false,
				progress: undefined,
			})),
		);
	}, []);

	return {
		staged,
		stage,
		unstage,
		clear,
		markUploading,
		setProgress,
		resetUploading,
	};
}
