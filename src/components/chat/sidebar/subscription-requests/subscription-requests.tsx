import { RiUserAddLine } from "@remixicon/react";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Button } from "#/components/ui/button";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";

export function SubscriptionRequests() {
	const state = useXmppState();
	const actions = useXmppActions();

	if (state.subscriptionRequests.length === 0) return null;

	return (
		<div className="mx-3 mb-2 rounded-lg border border-border bg-muted/40 p-2">
			<p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
				<RiUserAddLine className="size-3.5" />
				Contact requests
			</p>
			<ul className="flex flex-col gap-2">
				{state.subscriptionRequests.map((request) => (
					<li key={request.jid} className="flex items-center gap-2">
						<UserAvatar jid={request.jid} name={request.name} size="sm" />
						<span className="min-w-0 flex-1 truncate text-xs">
							{request.name || request.jid}
						</span>
						<Button
							size="xs"
							variant="secondary"
							onClick={() => void actions.acceptSubscription(request.jid)}
						>
							Accept
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}
