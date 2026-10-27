import { useEffect, useRef, useState } from "react";

function hasFiles(event: DragEvent): boolean {
	return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

/**
 * Detects file drags anywhere in the window and reports dropped files.
 * Ignores text and link drags. A depth counter keeps `isDragging` stable
 * while the cursor moves across child elements.
 */
export function useFileDrop(
	onFiles: (files: File[]) => void,
	enabled: boolean,
): { isDragging: boolean } {
	const [isDragging, setIsDragging] = useState(false);
	const depth = useRef(0);
	const onFilesRef = useRef(onFiles);
	useEffect(() => {
		onFilesRef.current = onFiles;
	}, [onFiles]);

	useEffect(() => {
		if (!enabled) {
			depth.current = 0;
			setIsDragging(false);
			return;
		}

		const reset = () => {
			depth.current = 0;
			setIsDragging(false);
		};

		const onEnter = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			depth.current += 1;
			setIsDragging(true);
		};

		const onLeave = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			depth.current = Math.max(0, depth.current - 1);
			if (depth.current === 0) setIsDragging(false);
		};

		// Required so the browser treats the window as a valid drop target.
		const onOver = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
		};

		const onDrop = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			const files = Array.from(event.dataTransfer?.files ?? []);
			reset();
			if (files.length > 0) onFilesRef.current(files);
		};

		window.addEventListener("dragenter", onEnter);
		window.addEventListener("dragleave", onLeave);
		window.addEventListener("dragover", onOver);
		window.addEventListener("drop", onDrop);
		window.addEventListener("dragend", reset);
		window.addEventListener("blur", reset);
		return () => {
			window.removeEventListener("dragenter", onEnter);
			window.removeEventListener("dragleave", onLeave);
			window.removeEventListener("dragover", onOver);
			window.removeEventListener("drop", onDrop);
			window.removeEventListener("dragend", reset);
			window.removeEventListener("blur", reset);
		};
	}, [enabled]);

	return { isDragging };
}
