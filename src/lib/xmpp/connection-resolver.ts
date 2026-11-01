import { discoverConnectionEndpoints } from "#/lib/xmpp/discovery";

export interface ConnectionTargets {
	websocket?: string;
	bosh?: string;
	source: "explicit" | "discovered" | "probed" | "fallback";
}

const WS_PATHS = ["/xmpp-websocket", "/ws", "/websocket", "/"];

/**
 * Conventional WebSocket endpoints tried when a server publishes no host-meta.
 * `wss` on 443 covers nginx/caddy, 5281 Prosody TLS, 5443 ejabberd; plain `ws`
 * on 5280 covers local dev.
 */
const CONVENTIONAL: Array<{ scheme: "wss" | "ws"; port?: number }> = [
	{ scheme: "wss" },
	{ scheme: "wss", port: 5281 },
	{ scheme: "wss", port: 5443 },
	{ scheme: "ws", port: 5280 },
];

const PROBE_TIMEOUT_MS = 3_500;
const MAX_PROBES = 12;

/** Deterministic candidate list; custom host/port takes priority over the domain. */
export function buildWebSocketCandidates({
	domain,
	host,
	port,
}: {
	domain: string;
	host?: string;
	port?: number;
}): string[] {
	const hostName = (host || domain)
		.trim()
		.replace(/^https?:\/\//i, "")
		.replace(/\/+$/, "");
	if (!hostName) return [];
	const ports: Array<{ scheme: "wss" | "ws"; port?: number }> = port
		? [
				{ scheme: "wss", port },
				{ scheme: "ws", port },
			]
		: CONVENTIONAL;
	const candidates: string[] = [];
	for (const { scheme, port: candidatePort } of ports) {
		for (const path of WS_PATHS) {
			const authority = candidatePort
				? `${hostName}:${candidatePort}`
				: hostName;
			candidates.push(`${scheme}://${authority}${path}`);
		}
	}
	return [...new Set(candidates)];
}

/** Opens a WebSocket with the XMPP subprotocol; resolves false on any failure. */
export function probeWebSocket(
	url: string,
	timeoutMs = PROBE_TIMEOUT_MS,
): Promise<boolean> {
	return new Promise((resolve) => {
		if (typeof WebSocket === "undefined") return resolve(false);
		let settled = false;
		const finish = (ok: boolean) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try {
				socket.close();
			} catch {
				// Closing an unopened socket can throw; the result stands either way.
			}
			resolve(ok);
		};
		let socket: WebSocket;
		try {
			socket = new WebSocket(url, "xmpp");
		} catch {
			return resolve(false);
		}
		const timer = setTimeout(() => finish(false), timeoutMs);
		socket.onopen = () => finish(true);
		socket.onerror = () => finish(false);
		socket.onclose = () => finish(false);
	});
}

/**
 * Connection endpoint resolution for a browser client:
 *
 * 1. XEP-0156 host-meta (the standards path).
 * 2. Conventional WebSocket paths, first for a user-specified host/port, then
 *    for the JID domain. Browsers cannot query DNS SRV, so conventional paths
 *    are the Gajim-style "custom host/port" fallback for WebSocket.
 * 3. Falls back to Stanza's own discovery when nothing answers.
 */
export async function resolveConnectionTargets({
	domain,
	host,
	port,
	skipDiscovery = false,
}: {
	domain: string;
	host?: string;
	port?: number;
	skipDiscovery?: boolean;
}): Promise<ConnectionTargets> {
	let discovered: Awaited<
		ReturnType<typeof discoverConnectionEndpoints>
	> | null = null;
	if (!skipDiscovery) {
		try {
			discovered = await discoverConnectionEndpoints(domain);
		} catch {
			discovered = null;
		}
	}

	const candidates: string[] = [];
	if (host || port) {
		candidates.push(...buildWebSocketCandidates({ domain, host, port }));
	}
	if (discovered?.websocket) candidates.push(discovered.websocket);
	candidates.push(...buildWebSocketCandidates({ domain }));

	const tried: string[] = [];
	for (const candidate of candidates.slice(0, MAX_PROBES)) {
		tried.push(candidate);
		if (await probeWebSocket(candidate)) {
			return { websocket: candidate, bosh: discovered?.bosh, source: "probed" };
		}
	}

	if (discovered?.websocket) {
		return {
			websocket: discovered.websocket,
			bosh: discovered.bosh,
			source: "discovered",
		};
	}
	return { websocket: undefined, bosh: discovered?.bosh, source: "fallback" };
}

export interface ResolvedTransports {
	websocketUrl?: string;
	boshUrl?: string;
}

/** Keeps client.connect free of discovery logic. */
export async function resolveConnectTransports(
	credentials: {
		jid: string;
		websocketUrl?: string;
		boshUrl?: string;
		host?: string;
		port?: number;
	},
	domain: string,
): Promise<ResolvedTransports> {
	if (credentials.websocketUrl || credentials.boshUrl) {
		return {
			websocketUrl: credentials.websocketUrl,
			boshUrl: credentials.boshUrl,
		};
	}
	const targets = await resolveConnectionTargets({
		domain,
		host: credentials.host,
		port: credentials.port,
	});
	return { websocketUrl: targets.websocket, boshUrl: targets.bosh };
}
