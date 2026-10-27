import { RiChat3Line } from "@remixicon/react";
import { CenteredEmptyState } from "#/components/common/centered-empty/centered-empty";

export function EmptyConversation() {
	return (
		<div className="flex h-full items-center justify-center bg-background p-6">
			<CenteredEmptyState
				icon={<RiChat3Line />}
				title="Select a conversation"
				description="Choose a contact from the sidebar or start a new chat from your roster."
			/>
		</div>
	);
}
