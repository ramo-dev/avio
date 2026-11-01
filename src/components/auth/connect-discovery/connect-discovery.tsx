import { useCallback, useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { resolveConnectionTargets } from "#/lib/xmpp/connection-resolver";
import { parseJid } from "#/lib/xmpp/jid";

type DiscoveryState =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "found"; websocket?: string; bosh?: string }
	| { status: "error"; message: string };

/**
 * XEP-0156 discovery UI for the connect screen. Automatic lookup runs on open
 * when no manual endpoints are set, mirroring Gajim's account setup.
 */
export function ConnectDiscovery({
	jid,
	host,
	port,
	websocketUrl,
	boshUrl,
	onUse,
	disabled,
}: {
	host?: string;
	port?: number;
	jid: string;
	websocketUrl: string;
	boshUrl: string;
	onUse: (endpoints: { websocket?: string; bosh?: string }) => void;
	disabled?: boolean;
}) {
	const domain = parseJid(jid)?.bareJid.split("@")[1] ?? "";
	const manual = Boolean(websocketUrl || boshUrl);
	// Local/dev servers publish no host-meta and would only produce refused
	// connection errors. Automatic discovery targets public domains.
	const isLocalDomain =
		/^(localhost|127\.\d+|\[?::1\]?)$/i.test(domain) ||
		domain.endsWith(".localhost");
	const [state, setState] = useState<DiscoveryState>({ status: "idle" });

	const run = useCallback(async () => {
		if (!domain || disabled) return;
		setState({ status: "loading" });
		try {
			const result = await resolveConnectionTargets({
				domain,
				host,
				port,
				skipDiscovery: isLocalDomain,
			});
			if (result.websocket || result.bosh) {
				setState({
					status: "found",
					websocket: result.websocket,
					bosh: result.bosh,
				});
			} else {
				setState({
					status: "error",
					message: "No endpoints answered. Enter one manually.",
				});
			}
		} catch (cause) {
			setState({
				status: "error",
				message:
					cause instanceof Error
						? cause.message
						: "Discovery failed. Enter the endpoint manually.",
			});
		}
	}, [domain, host, port, isLocalDomain, disabled]);

	useEffect(() => {
		if (manual || !domain || isLocalDomain) return;
		void run();
	}, [domain, isLocalDomain, manual, run]);

	const statusText =
		state.status === "loading"
			? "Looking up server settings…"
			: state.status === "found"
				? state.websocket || state.bosh
					? "Found connection methods:"
					: "The server published no usable endpoints. Enter one manually."
				: state.status === "error"
					? state.message
					: manual
						? "Manual endpoints are set; discovery is off."
						: "Avio looks up the server's endpoints automatically.";

	return (
		<div className="rounded-lg border border-border bg-muted/40 p-3">
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs font-medium text-muted-foreground">
					Automatic discovery
				</p>
				<Button
					type="button"
					size="xs"
					variant="ghost"
					disabled={
						state.status === "loading" || !domain || isLocalDomain || disabled
					}
					onClick={() => void run()}
				>
					{state.status === "loading" && <Spinner className="size-3" />}
					Discover
				</Button>
			</div>
			<p className="mt-1 text-xs text-muted-foreground">{statusText}</p>
			{state.status === "found" && (
				<dl className="mt-2 space-y-1">
					{(
						[
							["WebSocket", state.websocket, "websocket"],
							["BOSH", state.bosh, "bosh"],
						] as const
					).map(([label, url, field]) => (
						<div key={label} className="flex items-center gap-2">
							<dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
							<dd className="min-w-0 flex-1 truncate font-mono text-[0.7rem]">
								{url ?? "Not advertised"}
							</dd>
							{url && (
								<Button
									type="button"
									size="xs"
									variant={
										url === (field === "websocket" ? websocketUrl : boshUrl)
											? "secondary"
											: "ghost"
									}
									disabled={disabled}
									onClick={() => onUse({ [field]: url })}
								>
									{url === (field === "websocket" ? websocketUrl : boshUrl)
										? "Selected"
										: "Use"}
								</Button>
							)}
						</div>
					))}
				</dl>
			)}
		</div>
	);
}
