import type { ServerCapabilities } from "#/types/server-capabilities";

/**
 * Presentation statuses for detected server capabilities, grouped so that
 * problems surface first: insecure transport, then new, upcoming, active,
 * and finally things a browser client can never do.
 */
export type ServerServiceStatus =
	| "insecure"
	| "new"
	| "upcoming"
	| "active"
	| "unsupported";

export interface ServerServiceView {
	id: string;
	name: string;
	description?: string;
	status: ServerServiceStatus;
	/** Short mono detail (component JID, scheme) shown next to the pill. */
	detail?: string;
	/** Pill text; falls back to the status label when omitted. */
	statusLabel?: string;
}

export const SERVER_STATUS_ORDER = [
	"insecure",
	"new",
	"upcoming",
	"active",
	"unsupported",
] as const satisfies readonly ServerServiceStatus[];

export const SERVER_STATUS_META: Record<
	ServerServiceStatus,
	{ title: string; hint: string; label: string }
> = {
	insecure: {
		title: "Needs attention",
		hint: "Settings that put your traffic at risk",
		label: "Not secure",
	},
	new: {
		title: "New",
		hint: "Recently added to your server",
		label: "New",
	},
	upcoming: {
		title: "Upcoming",
		hint: "Supported by the server, not yet available",
		label: "Not advertised",
	},
	active: {
		title: "Active",
		hint: "Ready to use",
		label: "Available",
	},
	unsupported: {
		title: "Not in this browser",
		hint: "Limited by browser capabilities",
		label: "Browser n/a",
	},
};

export interface ServerSummary {
	active: number;
	attention: number;
	upcoming: number;
}

const INSECURE_TRANSPORT_DESCRIPTION =
	"Connected over plain WebSocket (ws). Production servers should use wss.";

/** Maps raw disco/XEP-0215 capability detection to grouped UI rows. */
export function buildServerServiceViews(
	capabilities: ServerCapabilities,
): ServerServiceView[] {
	const transport: ServerServiceView =
		capabilities.transport === "bosh"
			? { id: "transport", name: "Transport", detail: "BOSH", status: "active" }
			: capabilities.tls
				? {
						id: "transport",
						name: "Transport",
						detail: "WSS",
						status: "active",
					}
				: {
						id: "transport",
						name: "Transport",
						description: INSECURE_TRANSPORT_DESCRIPTION,
						detail: "WS",
						status: "insecure",
					};

	const stunDetail = capabilities.externalServices
		.map((service) =>
			`${service.type ?? "service"} ${service.host ?? ""}${service.port ? `:${service.port}` : ""}`.trim(),
		)
		.join(", ");

	return [
		transport,
		{
			id: "reactions",
			name: "Message reactions",
			description: "XEP-0444",
			status: "new",
		},
		{
			id: "stun",
			name: "STUN / TURN",
			description: "XEP-0215. Calls need this to work across networks.",
			status: capabilities.externalServices.length > 0 ? "active" : "upcoming",
			detail: capabilities.externalServices.length > 0 ? stunDetail : undefined,
		},
		{
			id: "muc",
			name: "Group chats (MUC)",
			status: capabilities.muc ? "active" : "upcoming",
			detail: capabilities.muc ?? undefined,
		},
		{
			id: "upload",
			name: "File upload",
			description: "XEP-0363",
			status: capabilities.upload ? "active" : "upcoming",
			detail: capabilities.upload?.jid ?? undefined,
		},
		{
			id: "mam",
			name: "Message archive",
			description: "MAM",
			status: capabilities.mam ? "active" : "upcoming",
		},
		{
			id: "carbons",
			name: "Message carbons",
			status: capabilities.carbons ? "active" : "upcoming",
		},
		{
			id: "blocklist",
			name: "Block list",
			description: "XEP-0191",
			status: capabilities.blocking ? "active" : "upcoming",
		},
		{
			id: "pep",
			name: "PEP / vCards",
			status: capabilities.pep || capabilities.vcard ? "active" : "upcoming",
		},
		{
			id: "srv",
			name: "SRV records",
			description:
				"Browsers cannot query DNS SRV. Endpoints come from host-meta (XEP-0156) and conventional paths.",
			status: "unsupported",
		},
	];
}

/** Groups services by status in display order, skipping empty groups. */
export function groupServerServices(
	services: ServerServiceView[],
): Array<{ status: ServerServiceStatus; items: ServerServiceView[] }> {
	return SERVER_STATUS_ORDER.map((status) => ({
		status,
		items: services.filter((service) => service.status === status),
	})).filter((group) => group.items.length > 0);
}

export function summarizeServerServices(
	services: ServerServiceView[],
): ServerSummary {
	return {
		active: services.filter((service) => service.status === "active").length,
		attention: services.filter((service) => service.status === "insecure")
			.length,
		upcoming: services.filter(
			(service) => service.status === "upcoming" || service.status === "new",
		).length,
	};
}
