import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "#/components/ui/textarea";
import { useFileDrop } from "#/hooks/use-file-drop";
import { useStagedFiles } from "#/hooks/use-staged-files";
import { useTyping } from "#/hooks/use-typing";
import { useXmppActions } from "#/hooks/xmpp/use-xmpp";
import { cn } from "#/lib/utils";
import type { ChatMessage } from "#/types/chat";
import { AttachmentTray } from "./attachment-tray";
import { ComposerActions } from "./composer-actions/composer-actions";
import { ComposerContext } from "./composer-context/composer-context";
import { DropOverlay } from "./drop-overlay";

/** scrollHeight above this means the text wrapped to a second line. */
const SINGLE_LINE_MAX = 44;

type ComposerProps = {
	jid: string;
	disabled: boolean;
	contactName: string;
	replyTo?: ChatMessage | null;
	editing?: ChatMessage | null;
	onContextDone?: () => void;
	/** Called on send when files are staged. Omit to hide attachments. */
	onSendFiles?: (
		files: File[],
		caption: string,
		onProgress?: (index: number, percent: number) => void,
	) => void | Promise<void>;
};

export function Composer({
	jid,
	disabled,
	contactName,
	replyTo,
	editing,
	onContextDone,
	onSendFiles,
}: ComposerProps) {
	const actions = useXmppActions();
	const notifyTyping = useTyping(jid, !disabled);

	const [body, setBody] = useState("");
	const [expanded, setExpanded] = useState(false);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const prefilledEditId = useRef<string | null>(null);
	const focusedContextId = useRef<string | null>(null);
	const draftBeforeEdit = useRef("");
	const contextActive = Boolean(replyTo || editing);

	const canAttach = Boolean(onSendFiles) && !disabled && !contextActive;
	const {
		staged,
		stage,
		unstage,
		clear,
		markUploading,
		setProgress,
		resetUploading,
	} = useStagedFiles(canAttach, () => textareaRef.current?.focus());
	const uploading = staged.some((item) => item.uploading);
	const canSend =
		!disabled &&
		!uploading &&
		(body.trim().length > 0 || (!contextActive && staged.length > 0));

	// Expand once the text wraps or contains a newline. Collapse only when
	// empty, so the wider expanded layout can't flip it back and forth.
	useLayoutEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		const contextId = editing?.id ?? replyTo?.id ?? null;
		if (!contextId) focusedContextId.current = null;
		if (!editing) prefilledEditId.current = null;

		if (editing && prefilledEditId.current !== editing.id) {
			prefilledEditId.current = editing.id;
			draftBeforeEdit.current = body;
			setBody(editing.body);
			el.focus();
			focusedContextId.current = contextId;
			return;
		}
		if (contextId && focusedContextId.current !== contextId) {
			focusedContextId.current = contextId;
			el.focus();
		}
		if (body.length === 0) {
			if (expanded) setExpanded(false);
			return;
		}
		if (
			!expanded &&
			(body.includes("\n") || el.scrollHeight > SINGLE_LINE_MAX)
		) {
			setExpanded(true);
		}
	}, [body, editing, expanded, replyTo]);

	const { isDragging } = useFileDrop(stage, canAttach);

	function insertAtCaret(text: string) {
		const el = textareaRef.current;
		const start = el?.selectionStart ?? body.length;
		const end = el?.selectionEnd ?? body.length;
		setBody(body.slice(0, start) + text + body.slice(end));
		requestAnimationFrame(() => {
			el?.focus();
			el?.setSelectionRange(start + text.length, start + text.length);
		});
	}

	function focusFromPill(event: React.MouseEvent<HTMLDivElement>) {
		const target = event.target as HTMLElement;
		if (target.closest("button, input, textarea, [role=button]")) return;
		event.preventDefault();
		textareaRef.current?.focus();
	}

	async function send() {
		if (!canSend) return;
		const value = body.trim();
		if (staged.length > 0 && onSendFiles && !contextActive) {
			markUploading();
			try {
				await onSendFiles(
					staged.map((item) => item.file),
					value,
					setProgress,
				);
				clear();
				setBody("");
				onContextDone?.();
			} catch {
				resetUploading();
			}
			return;
		}

		if (value) {
			const options = editing
				? { editId: editing.id }
				: replyTo
					? { replyTo: { id: replyTo.id, to: replyTo.from } }
					: undefined;
			void actions.sendMessage(jid, value, undefined, options);
			setBody("");
			draftBeforeEdit.current = "";
			onContextDone?.();
		}
	}

	function cancelContext() {
		if (editing) setBody(draftBeforeEdit.current);
		draftBeforeEdit.current = "";
		onContextDone?.();
	}

	const placeholder = useMemo(() => {
		if (disabled) return "Reconnect to send messages";
		if (editing) return "Edit message";
		if (replyTo) return "Write a reply";
		return staged.length > 0 ? "Add a caption" : "Write a message";
	}, [disabled, editing, replyTo, staged.length]);

	return (
		<>
			<DropOverlay active={isDragging} />
			<form
				onSubmit={(event) => {
					event.preventDefault();
					send();
				}}
				className="shrink-0 bg-background p-3 md:p-5"
			>
				<div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
					{contextActive && (
						<ComposerContext
							replyTo={replyTo}
							editing={editing}
							contactName={contactName}
							onCancel={cancelContext}
						/>
					)}
					{staged.length > 0 && (
						<AttachmentTray items={staged} onRemove={unstage} />
					)}

					{/* biome-ignore lint/a11y/noStaticElementInteractions: clicking the composer padding focuses the textarea */}
					<div
						data-expanded={expanded}
						onMouseDown={focusFromPill}
						className={cn(
							"relative min-w-0 cursor-text rounded-md border border-input bg-card pt-2 transition-[padding,box-shadow] duration-200 ease-out focus-within:ring-2 focus-within:ring-ring/50 motion-reduce:transition-none",
							expanded ? "pb-11" : "pb-2",
						)}
					>
						<Textarea
							ref={textareaRef}
							value={body}
							onChange={(event) => {
								setBody(event.target.value);
								notifyTyping();
							}}
							onKeyDown={(event) => {
								if (
									event.key === "Enter" &&
									!event.shiftKey &&
									!event.nativeEvent.isComposing
								) {
									event.preventDefault();
									send();
								}
							}}
							onPaste={(event) => {
								if (event.clipboardData.files.length > 0) {
									event.preventDefault();
									stage(event.clipboardData.files);
								}
							}}
							placeholder={placeholder}
							aria-label="Message"
							disabled={disabled}
							rows={1}
							className={cn(
								"max-h-40 min-h-9 w-full resize-none border-0 bg-transparent py-2 shadow-none [field-sizing:content] focus-visible:ring-0 dark:bg-transparent",
								expanded ? "px-4" : canAttach ? "pl-12 pr-24" : "pl-4 pr-24",
							)}
						/>

						<ComposerActions
							disabled={disabled}
							canSend={canSend}
							canAttach={canAttach}
							onStage={stage}
							onEmojiSelect={insertAtCaret}
							textareaRef={textareaRef}
						/>
					</div>
				</div>
			</form>
		</>
	);
}
