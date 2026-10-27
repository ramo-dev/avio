import { ConnectionBadge } from "#/components/common/connection-badge/connection-badge";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";

export function ConnectionFooter() {
	const state = useXmppState();

	return (
		<div className="mt-auto border-t border-sidebar-border p-3">
			<div className="flex items-center justify-between gap-2">
				<ConnectionBadge status={state.connection.status} />
				<span className="text-[0.7rem] text-muted-foreground">
					{state.account?.domain}
				</span>
			</div>
		</div>
	);
}
