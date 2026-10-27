import {
	RiCheckDoubleLine,
	RiCheckLine,
	RiErrorWarningLine,
	RiTimeLine,
} from "@remixicon/react";
import { conversationPreview } from "#/lib/format/conversation";
import { cn } from "#/lib/utils";
import type { MessageStatus } from "#/types/chat";
import type { ConversationListItem } from "#/types/chat-ui";

export function ConversationPreview({
	item,
	selected,
}: {
	item: ConversationListItem;
	selected: boolean;
}) {
	const preview = conversationPreview(item);

	if (preview.typing) {
		return <span className="italic">typing…</span>;
	}

	return (
		<>
			{preview.prefix && <span className="shrink-0">{preview.prefix}</span>}
			<span
				className={cn(
					"truncate",
					item.unread > 0 && !selected
						? "font-medium text-foreground"
						: undefined,
				)}
			>
				{preview.text}
			</span>
			{preview.status && <DeliveryTick status={preview.status} />}
		</>
	);
}

function DeliveryTick({ status }: { status: MessageStatus }) {
	if (status === "failed") {
		return (
			<RiErrorWarningLine className="size-3.5 shrink-0 text-destructive" />
		);
	}
	if (status === "pending") {
		return <RiTimeLine className="size-3.5 shrink-0" />;
	}
	if (status === "sent") {
		return <RiCheckLine className="size-3.5 shrink-0" />;
	}
	return <RiCheckDoubleLine className="size-3.5 shrink-0" />;
}
