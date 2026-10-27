import { RiErrorWarningLine } from "@remixicon/react";
import { ConnectionBadge } from "#/components/common/connection-badge/connection-badge";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";

export function ConnectionFooter() {
	const state = useXmppState();
	const error = state.connection.error;

	return (
		<div className="mt-auto border-t border-sidebar-border p-3">
			<div className="flex items-center justify-between gap-2">
				<ConnectionBadge status={state.connection.status} />
				<span className="text-[0.7rem] text-muted-foreground">
					{state.account?.domain}
				</span>
			</div>
			{error && (
				<p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
					<RiErrorWarningLine className="mt-0.5 size-3.5 shrink-0" />
					<span>{error.message}</span>
				</p>
			)}
		</div>
	);
}
