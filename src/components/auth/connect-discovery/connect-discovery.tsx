import { RiCheckLine, RiRefreshLine } from "@remixicon/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";
import { resolveConnectionTargets } from "#/lib/xmpp/connection-resolver";
import { parseJid } from "#/lib/xmpp/jid";

type DiscoveryState =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "found"; websocket?: string; bosh?: string }
	| { status: "error"; message: string };

type EndpointField = "websocket" | "bosh";

/**
 * XEP-0156 discovery UI for the connect screen. Automatic lookup runs after the
 * JID settles, and every result is explicitly selectable rather than inferred.
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
	// Local/dev servers publish no host-meta and would only produce refused
	// connection errors. Automatic discovery targets public domains.
	const isLocalDomain =
		/^(localhost|127\.\d+|\[?::1\]?)$/i.test(domain) ||
		domain.endsWith(".localhost");
	const manual = Boolean(websocketUrl || boshUrl);
	const [state, setState] = useState<DiscoveryState>({ status: "idle" });
	const requestId = useRef(0);

	const run = useCallback(async () => {
		if (!domain || disabled) return;
		const request = ++requestId.current;
		setState({ status: "loading" });
		try {
			const result = await resolveConnectionTargets({
				domain,
				host,
				port,
				skipDiscovery: isLocalDomain,
			});
			if (request !== requestId.current) return;
			if (result.websocket || result.bosh) {
				setState({
					status: "found",
					websocket: result.websocket,
					bosh: result.bosh,
				});
			} else {
				setState({
					status: "error",
					message:
						result.discoveryError ??
						"No endpoint answered. Enter the server's WebSocket URL manually.",
				});
			}
		} catch (cause) {
			if (request !== requestId.current) return;
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
		const timer = setTimeout(() => void run(), 600);
		return () => clearTimeout(timer);
	}, [domain, isLocalDomain, manual, run]);

	useEffect(() => {
		return () => {
			requestId.current += 1;
		};
	}, []);

	const statusText =
		state.status === "loading"
			? "Checking the domain and common WebSocket paths…"
			: state.status === "found"
				? "Pick the method Avio should use."
				: state.status === "error"
					? state.message
					: "Avio looks up the server's published connection methods.";

	return (
		<div className="flex min-h-0 flex-col gap-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-sm font-medium text-foreground">
						Connection methods
					</p>
					<p
						aria-live="polite"
						className="mt-1 text-xs leading-relaxed text-muted-foreground"
					>
						{statusText}
					</p>
				</div>
				<Button
					type="button"
					size="xs"
					variant="outline"
					disabled={
						state.status === "loading" || !domain || isLocalDomain || disabled
					}
					onClick={() => void run()}
				>
					{state.status === "loading" ? (
						<Spinner className="size-3" />
					) : (
						<RiRefreshLine aria-hidden className="size-3.5" />
					)}
					Discover
				</Button>
			</div>

			{state.status === "loading" && (
				<div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
					<Spinner className="size-4" />
					Testing published and common endpoints…
				</div>
			)}

			{state.status === "found" && (
				<div className="space-y-2">
					<EndpointRow
						disabled={disabled}
						field="websocket"
						onUse={onUse}
						selected={Boolean(
							state.websocket && state.websocket === websocketUrl,
						)}
						url={state.websocket}
					/>
					<EndpointRow
						disabled={disabled}
						field="bosh"
						onUse={onUse}
						selected={Boolean(state.bosh && state.bosh === boshUrl)}
						url={state.bosh}
					/>
				</div>
			)}

			<p className="mt-auto text-xs leading-relaxed text-muted-foreground">
				Browsers and the desktop webview can only use WebSocket or BOSH. Port
				5222 is raw XMPP and is not reachable from here.
			</p>
		</div>
	);
}

function EndpointRow({
	field,
	url,
	selected,
	onUse,
	disabled,
}: {
	field: EndpointField;
	url?: string;
	selected: boolean;
	onUse: (endpoints: { websocket?: string; bosh?: string }) => void;
	disabled?: boolean;
}) {
	if (!url) {
		return (
			<div className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
				{field === "websocket" ? "WebSocket" : "BOSH"} not advertised.
			</div>
		);
	}

	return (
		<button
			type="button"
			aria-pressed={selected}
			className={cn(
				"flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50",
				selected
					? "border-primary bg-primary/5"
					: "border-border bg-background hover:bg-accent",
			)}
			disabled={disabled}
			onClick={() =>
				onUse(field === "websocket" ? { websocket: url } : { bosh: url })
			}
		>
			<span
				className={cn(
					"flex size-9 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
					selected
						? "bg-primary text-primary-foreground"
						: "bg-muted text-muted-foreground",
				)}
			>
				{field === "websocket" ? "WS" : "BOSH"}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate font-mono text-xs text-foreground">
					{url}
				</span>
				<span className="block text-[0.7rem] text-muted-foreground">
					{selected ? "Selected for the next connection" : "Use this endpoint"}
				</span>
			</span>
			{selected && <RiCheckLine aria-hidden className="size-4 shrink-0" />}
		</button>
	);
}
