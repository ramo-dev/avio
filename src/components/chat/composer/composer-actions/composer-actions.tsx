import {
	RiAddCircleLine,
	RiArrowUpLine,
	RiEmotionLine,
	RiFileLine,
	RiImageLine,
	RiLockLine,
	RiLockUnlockLine,
	RiMusicLine,
} from "@remixicon/react";
import { useRef, useState } from "react";
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";

export function ComposerActions({
	disabled,
	canSend,
	canAttach,
	showEncryption,
	encryptionEnabled,
	onToggleEncryption,
	onStage,
	onEmojiSelect,
	textareaRef,
}: {
	disabled: boolean;
	canSend: boolean;
	canAttach: boolean;
	showEncryption?: boolean;
	encryptionEnabled?: boolean;
	onToggleEncryption?: () => void;
	onStage: (files: FileList | null) => void;
	onEmojiSelect: (emoji: string) => void;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
	const [emojiOpen, setEmojiOpen] = useState(false);
	const imageInputRef = useRef<HTMLInputElement>(null);
	const audioInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	return (
		<div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-2">
			<div className="flex items-center gap-1">
				{showEncryption && (
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									type="button"
									variant={encryptionEnabled ? "secondary" : "ghost"}
									size="icon"
									disabled={disabled}
									onClick={onToggleEncryption}
									aria-label={
										encryptionEnabled
											? "Turn off message encryption"
											: "Turn on message encryption"
									}
									aria-pressed={encryptionEnabled}
									className="size-9 shrink-0 rounded-full text-muted-foreground"
								/>
							}
						>
							{encryptionEnabled ? (
								<RiLockLine className="size-5" />
							) : (
								<RiLockUnlockLine className="size-5" />
							)}
						</TooltipTrigger>
						<TooltipContent>
							{encryptionEnabled
								? "Encryption on"
								: "Encrypt this conversation"}
						</TooltipContent>
					</Tooltip>
				)}
				{canAttach && (
					<>
						<DropdownMenu>
							<Tooltip>
								<TooltipTrigger render={<span className="inline-flex" />}>
									<DropdownMenuTrigger
										render={
											<Button
												type="button"
												variant="ghost"
												size="icon"
												disabled={disabled}
												aria-label="Attach"
												className="size-9 shrink-0 rounded-full text-muted-foreground"
											/>
										}
									>
										<RiAddCircleLine className="size-5" />
									</DropdownMenuTrigger>
								</TooltipTrigger>
								<TooltipContent>Attach</TooltipContent>
							</Tooltip>
							<DropdownMenuContent
								align="start"
								side="top"
								className="md:min-w-38"
							>
								<DropdownMenuItem
									onClick={() => imageInputRef.current?.click()}
								>
									<RiImageLine /> Photo or video
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => audioInputRef.current?.click()}
								>
									<RiMusicLine /> Audio
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
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
							onChange={(event) => {
								onStage(event.target.files);
								event.target.value = "";
							}}
						/>
						<input
							ref={audioInputRef}
							type="file"
							accept="audio/*"
							multiple
							hidden
							onChange={(event) => {
								onStage(event.target.files);
								event.target.value = "";
							}}
						/>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							hidden
							onChange={(event) => {
								onStage(event.target.files);
								event.target.value = "";
							}}
						/>
					</>
				)}
			</div>

			<div className="flex items-center gap-1">
				<Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
					<Tooltip>
						<TooltipTrigger render={<span className="inline-flex" />}>
							<PopoverTrigger
								render={
									<Button
										type="button"
										variant="secondary"
										size="icon"
										disabled={disabled}
										aria-label="Insert emoji"
										className="size-9 shrink-0 rounded-full text-muted-foreground"
									/>
								}
							>
								<RiEmotionLine className="size-5" />
							</PopoverTrigger>
						</TooltipTrigger>
						<TooltipContent>Emoji</TooltipContent>
					</Tooltip>
					<PopoverContent
						align="end"
						side="top"
						className="w-auto overflow-hidden rounded border p-0"
						finalFocus={() => textareaRef.current}
					>
						<EmojiPicker
							className="h-80"
							onEmojiSelect={({ emoji }: { emoji: string }) =>
								onEmojiSelect(emoji)
							}
						>
							<EmojiPickerSearch />
							<EmojiPickerContent />
							<EmojiPickerFooter />
						</EmojiPicker>
					</PopoverContent>
				</Popover>

				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								type="submit"
								size="icon"
								disabled={!canSend}
								aria-label="Send message"
								className="size-8 shrink-0 rounded-full"
							/>
						}
					>
						<RiArrowUpLine className="size-4" />
					</TooltipTrigger>
					<TooltipContent>Send</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}
