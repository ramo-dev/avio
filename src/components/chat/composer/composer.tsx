import { useLayoutEffect, useRef, useState } from "react";
import { Textarea } from "#/components/ui/textarea";
import { useFileDrop } from "#/hooks/use-file-drop";
import { useSettings } from "#/hooks/use-settings";
import { useStagedFiles } from "#/hooks/use-staged-files";
import { useTyping } from "#/hooks/use-typing";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { cn } from "#/lib/utils";
import { useOmemo } from "#/providers/omemo-provider";
import { useSettings as useSettingsDialog } from "#/providers/settings-provider";
import type { ChatMessage } from "#/types/chat";
import { AttachmentTray } from "./attachment-tray";
import { ComposerActions } from "./composer-actions/composer-actions";
import { ComposerContext } from "./composer-context/composer-context";
import { ComposerFallbackDialog } from "./composer-fallback-dialog";
import { DropOverlay } from "./drop-overlay";
import { useComposerEncryption } from "./use-composer-encryption";
import { useComposerInsert } from "./use-composer-insert";
import { composerPlaceholder, createComposerSend } from "./use-composer-send";

/** scrollHeight above this means the text wrapped to a second line. */
const SINGLE_LINE_MAX = 44;

type ComposerProps = {
	jid: string;
	disabled: boolean;
	contactName: string;
	/** Overrides the disabled-state placeholder, e.g. for invite previews. */
	placeholderOverride?: string;
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
	placeholderOverride,
	replyTo,
	editing,
	onContextDone,
	onSendFiles,
}: ComposerProps) {
	const actions = useXmppActions();
	const omemo = useOmemo();
	const state = useXmppState();
	const { chats } = useSettings();
	const { openSettings } = useSettingsDialog();
	const notifyTyping = useTyping(jid, !disabled && chats.typingIndicators);
	const isDirect = state.conversations[jid]?.kind !== "group";
	const encryptionEnabled = isDirect && omemo.isEncryptionEnabled(jid);

	const [body, setBody] = useState("");
	const [expanded, setExpanded] = useState(false);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const prefilledEditId = useRef<string | null>(null);
	const focusedContextId = useRef<string | null>(null);
	const draftBeforeEdit = useRef("");
	const insertAtCaret = useComposerInsert(textareaRef, body, setBody);
	const contextActive = Boolean(replyTo || editing);

	const canAttach =
		Boolean(onSendFiles) && !disabled && !contextActive && !encryptionEnabled;
	const {
		staged,
		stage,
		unstage,
		clear,
		markUploading,
		setProgress,
		resetUploading,
	} = useStagedFiles(canAttach, () => textareaRef.current?.focus());
	const {
		encryptionAttention,
		fallbackBody,
		setFallbackBody,
		toggleEncryption,
		sendUnencryptedFallback,
	} = useComposerEncryption({
		jid,
		isDirect,
		omemo,
		stagedCount: staged.length,
		clearStaged: clear,
		setBody,
	});
	const uploading = staged.some((item) => item.uploading);
	const canSend =
		!disabled &&
		!uploading &&
		(encryptionEnabled
			? body.trim().length > 0
			: body.trim().length > 0 || (!contextActive && staged.length > 0));

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
	function focusFromPill(event: React.MouseEvent<HTMLDivElement>) {
		const target = event.target as HTMLElement;
		if (target.closest("button, input, textarea, [role=button]")) return;
		event.preventDefault();
		textareaRef.current?.focus();
	}
	const send = createComposerSend({
		jid,
		encryptionEnabled,
		encryptionAttention,
		omemo,
		actions,
		staged,
		onSendFiles,
		markUploading,
		resetUploading,
		clear,
		setProgress,
		body,
		setBody,
		setFallbackBody,
		contextActive,
		replyTo: replyTo ?? null,
		editing: editing ?? null,
		onContextDone,
		draftBeforeEdit,
	});
	function cancelContext() {
		if (editing) setBody(draftBeforeEdit.current);
		draftBeforeEdit.current = "";
		onContextDone?.();
	}

	const placeholder =
		placeholderOverride ??
		composerPlaceholder({
			disabled,
			stagedCount: staged.length,
			replyTo: replyTo ?? null,
			editing: editing ?? null,
		});

	return (
		<>
			<DropOverlay active={isDragging} />
			<form
				onSubmit={(event) => {
					event.preventDefault();
					send();
				}}
				className="shrink-0 bg-background p-3 md:p-5 md:pb-3 pb-8"
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
									chats.enterToSend &&
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
								isDirect && canAttach ? "pl-24!" : "pl-12!",
								(replyTo || editing) && encryptionEnabled ? "pl-4!" : "pl-12",
								expanded ? "px-4" : canAttach ? "pl-12 pr-24" : "pl-4 pr-24",
							)}
						/>

						<ComposerActions
							disabled={disabled}
							canSend={canSend}
							canAttach={canAttach}
							showEncryption={isDirect}
							encryptionEnabled={encryptionEnabled}
							encryptionAttention={encryptionAttention}
							onToggleEncryption={
								encryptionAttention
									? () =>
											openSettings({
												section: "security",
												anchor: "omemo",
											})
									: toggleEncryption
							}
							onStage={stage}
							onEmojiSelect={insertAtCaret}
							textareaRef={textareaRef}
						/>
					</div>
				</div>
			</form>

			<ComposerFallbackDialog
				open={fallbackBody !== null}
				onClose={() => setFallbackBody(null)}
				onSend={() => void sendUnencryptedFallback()}
			/>
		</>
	);
}
