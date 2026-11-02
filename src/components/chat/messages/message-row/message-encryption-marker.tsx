import { RiLockLine, RiLockUnlockLine } from "@remixicon/react";
import { cn } from "#/lib/utils";
import type { ChatMessage } from "#/types/chat";

/** Encryption state shown on every message bubble, including grouped runs. */
export function MessageEncryptionMarker({ message }: { message: ChatMessage }) {
	const outgoing = message.direction === "outgoing";

	if (!message.encrypted) {
		return (
			<span
				className="inline-flex items-center text-red-500"
				title="Sent without end-to-end encryption"
			>
				<RiLockUnlockLine className="size-3" aria-hidden="true" />
			</span>
		);
	}

	const trusted = outgoing || message.trusted === true;
	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5",
				!trusted && "font-medium text-warning",
			)}
			title={
				trusted
					? "End-to-end encrypted with a trusted device"
					: "End-to-end encrypted with an unverified device"
			}
		>
			<RiLockLine className="size-3" aria-hidden="true" />
			<span>{trusted ? "Encrypted" : "Unverified"}</span>
		</span>
	);
}
