const WEBSOCKET_REL = "urn:xmpp:alt-connections:websocket";
const BOSH_REL = "urn:xmpp:alt-connections:xbosh";
const DISCOVERY_TIMEOUT_MS = 6_000;

export interface ConnectionEndpoints {
	websocket?: string;
	bosh?: string;
}

export interface DiscoveryResult extends ConnectionEndpoints {
	/** True when at least one usable endpoint was found. */
	found: boolean;
}

/**
 * XEP-0156 business rules: host-meta is fetched over HTTPS only, and connection
 * URLs must use wss or https. Plain ws/http URLs are never accepted here.
 */
function allowedUrl(value: unknown, schemes: string[]): string | undefined {
	if (typeof value !== "string") return undefined;
	try {
		const url = new URL(value);
		return schemes.includes(url.protocol) ? url.toString() : undefined;
	} catch {
		return undefined;
	}
}

function fromJsonLinks(raw: string): ConnectionEndpoints {
	const parsed: unknown = JSON.parse(raw);
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return {};
	}
	const links = (parsed as { links?: unknown }).links;
	if (!Array.isArray(links)) return {};
	const endpoints: ConnectionEndpoints = {};
	for (const link of links) {
		if (typeof link !== "object" || link === null) continue;
		const rel = (link as { rel?: unknown }).rel;
		const href = (link as { href?: unknown }).href;
		if (rel === WEBSOCKET_REL) {
			endpoints.websocket ??= allowedUrl(href, ["wss:"]);
		} else if (rel === BOSH_REL) {
			endpoints.bosh ??= allowedUrl(href, ["https:"]);
		}
	}
	return endpoints;
}

function fromHostMetaXml(raw: string): ConnectionEndpoints {
	const endpoints: ConnectionEndpoints = {};
	const linkPattern = /<link\b[^>]*>/gi;
	for (const match of raw.matchAll(linkPattern)) {
		const rel = match[0].match(/rel=["']([^"']+)["']/i)?.[1];
		const href = match[0].match(/href=["']([^"']+)["']/i)?.[1];
		if (!rel || !href) continue;
		if (rel === WEBSOCKET_REL) {
			endpoints.websocket ??= allowedUrl(href, ["wss:"]);
		} else if (rel === BOSH_REL) {
			endpoints.bosh ??= allowedUrl(href, ["https:"]);
		}
	}
	return endpoints;
}

async function fetchText(url: string): Promise<string> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			signal: controller.signal,
			cache: "no-store",
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return await response.text();
	} finally {
		clearTimeout(timer);
	}
}

/**
 * XEP-0156 connection-method discovery for a bare domain.
 *
 * Tries `host-meta.json` and the XML `host-meta` fallback. Only WebSocket and
 * BOSH endpoints with acceptable schemes are returned.
 */
export async function discoverConnectionEndpoints(
	rawDomain: string,
): Promise<DiscoveryResult> {
	const domain = rawDomain
		.trim()
		.replace(/^https?:\/\//i, "")
		.replace(/\/+$/, "");
	if (!domain || /\s/.test(domain)) {
		throw new Error("Enter a valid JID to discover server settings.");
	}

	const jsonUrl = `https://${domain}/.well-known/host-meta.json`;
	const xmlUrl = `https://${domain}/.well-known/host-meta`;

	try {
		const result = fromJsonLinks(await fetchText(jsonUrl));
		if (result.websocket || result.bosh) return { ...result, found: true };
	} catch {
		// Try the XML fallback below.
	}

	try {
		const result = fromHostMetaXml(await fetchText(xmlUrl));
		if (result.websocket || result.bosh) return { ...result, found: true };
	} catch {
		// Report the combined result below.
	}

	throw new Error(
		`No WebSocket or BOSH endpoint was found for ${domain}. The server may block cross-origin discovery (CORS) or publish no endpoint. Enter the WebSocket URL manually.`,
	);
}
