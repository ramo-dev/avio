import { type RefObject, useCallback } from "react";

/** Inserts text at the current textarea selection and restores focus. */
export function useComposerInsert(
	textareaRef: RefObject<HTMLTextAreaElement | null>,
	body: string,
	setBody: (body: string) => void,
) {
	return useCallback(
		(text: string) => {
			const element = textareaRef.current;
			const start = element?.selectionStart ?? body.length;
			const end = element?.selectionEnd ?? body.length;
			setBody(body.slice(0, start) + text + body.slice(end));
			requestAnimationFrame(() => {
				element?.focus();
				element?.setSelectionRange(start + text.length, start + text.length);
			});
		},
		[body, setBody, textareaRef],
	);
}
