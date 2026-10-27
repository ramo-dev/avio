import {
	RiAddCircleLine,
	RiArrowUpLine,
	RiEmotionLine,
	RiFileLine,
	RiImageLine,
} from "@remixicon/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "#/components/ui/emoji-picker";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { Textarea } from "#/components/ui/textarea";
import { useFileDrop } from "#/hooks/use-file-drop";
import { useStagedFiles } from "#/hooks/use-staged-files";
import { useTyping } from "#/hooks/use-typing";
import { useXmppActions } from "#/hooks/xmpp/use-xmpp";
import { cn } from "#/lib/utils";
import { AttachmentTray } from "./attachment-tray";
import { DropOverlay } from "./drop-overlay";

/** scrollHeight above this means the text wrapped to a second line. */
const SINGLE_LINE_MAX = 44;

type ComposerProps = {
	jid: string;
	disabled: boolean;
	/** Called on send when files are staged. Omit to hide attachments. */
	onSendFiles?: (files: File[], caption: string) => void | Promise<void>;
};

export function Composer({ jid, disabled, onSendFiles }: ComposerProps) {
	const actions = useXmppActions();
	const notifyTyping = useTyping(jid, !disabled);

	const [body, setBody] = useState("");
	const [emojiOpen, setEmojiOpen] = useState(false);
	const [expanded, setExpanded] = useState(false);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const imageInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const canAttach = Boolean(onSendFiles) && !disabled;
	const { staged, stage, unstage, clear } = useStagedFiles(canAttach, () =>
		textareaRef.current?.focus(),
	);
	const canSend = !disabled && (body.trim().length > 0 || staged.length > 0);

	// Expand once the text wraps or contains a newline. Collapse only when
	// empty, so the wider expanded layout can't flip it back and forth.
	useLayoutEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
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
	}, [body, expanded]);

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

	function send() {
		if (!canSend) return;
		const value = body.trim();
		if (staged.length > 0 && onSendFiles) {
			void onSendFiles(
				staged.map((s) => s.file),
				value,
			);
			clear();
		} else if (value) {
			void actions.sendMessage(jid, value);
		}
		setBody("");
	}

	const placeholder = useMemo(() => {
		if (disabled) return "Reconnect to send messages";
		return staged.length > 0 ? "Add a caption" : "Write a message";
	}, [disabled, staged.length]);

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
					{staged.length > 0 && (
						<AttachmentTray items={staged} onRemove={unstage} />
					)}

					<div className="flex items-end gap-2">
						{onSendFiles && (
							<>
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button
												type="button"
												variant="ghost"
												size="icon"
												disabled={disabled}
												aria-label="Attach"
												title="Attach"
												className="size-10 shrink-0 rounded-full text-muted-foreground"
											/>
										}
									>
										<RiAddCircleLine className="size-6" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start" side="top">
										<DropdownMenuItem
											onSelect={() => imageInputRef.current?.click()}
										>
											<RiImageLine /> Photo or video
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => fileInputRef.current?.click()}
										>
											<RiFileLine /> Document
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
								<input
									ref={imageInputRef}
									type="file"
									accept="image/*,video/*"
									multiple
									hidden
									onChange={(e) => {
										stage(e.target.files);
										e.target.value = "";
									}}
								/>
								<input
									ref={fileInputRef}
									type="file"
									multiple
									hidden
									onChange={(e) => {
										stage(e.target.files);
										e.target.value = "";
									}}
								/>
							</>
						)}

						<div
							data-expanded={expanded}
							className={cn(
								"relative min-w-0 flex-1 rounded-md border border-input bg-card pt-2 transition-[padding,box-shadow] duration-200 ease-out motion-reduce:transition-none",
								"focus-within:ring-2 focus-within:ring-ring/50",
								expanded ? "pb-11" : "pb-2",
								disabled && "opacity-60",
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
									"max-h-40 min-h-9 w-full resize-none border-0 bg-transparent py-2 pl-4 shadow-none [field-sizing:content] focus-visible:ring-0 dark:bg-transparent",
									"transition-[padding] duration-200 ease-out motion-reduce:transition-none",
									expanded ? "pr-4" : "pr-24",
								)}
							/>

							<div className="absolute bottom-2 right-1.5 flex items-center gap-1">
								<Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
									<PopoverTrigger
										render={
											<Button
												type="button"
												variant="secondary"
												size="icon"
												disabled={disabled}
												aria-label="Insert emoji"
												title="Emoji"
												className="size-9 shrink-0 rounded-full text-muted-foreground"
											/>
										}
									>
										<RiEmotionLine className="size-5" />
									</PopoverTrigger>
									<PopoverContent
										align="end"
										side="top"
										className="w-auto overflow-hidden rounded border p-0"
										finalFocus={() => textareaRef.current}
									>
										<EmojiPicker
											className="h-80"
											onEmojiSelect={({ emoji }: { emoji: string }) =>
												insertAtCaret(emoji)
											}
										>
											<EmojiPickerSearch />
											<EmojiPickerContent />
											<EmojiPickerFooter />
										</EmojiPicker>
									</PopoverContent>
								</Popover>

								<Button
									type="submit"
									size="icon"
									disabled={!canSend}
									aria-label="Send message"
									className="size-8 shrink-0 rounded-full"
								>
									<RiArrowUpLine className="size-4" />
								</Button>
							</div>
						</div>
					</div>
				</div>
			</form>
		</>
	);
}
