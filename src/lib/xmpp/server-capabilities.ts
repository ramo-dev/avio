import type { Agent } from "stanza";
import type {
	ServerCapabilities,
	XmppExternalService,
} from "#/types/server-capabilities";

/** Server-side XEP/capability detection through disco and XEP-0215. */
export async function detectServerCapabilities({
	client,
	domain,
	accountJid,
	transport,
	tls,
}: {
	client: Agent;
	domain: string;
	/** Bare JID; some features (MAM) are advertised on the account disco only. */
	accountJid: string;
	transport: "websocket" | "bosh";
	tls: boolean;
}): Promise<ServerCapabilities> {
	const [domainInfo, accountInfo] = await Promise.all([
		client.getDiscoInfo(domain),
		client.getDiscoInfo(accountJid).catch(() => null),
	]);
	const features: string[] = [
		...(domainInfo.features ?? []),
		...(accountInfo?.features ?? []),
	];
	const has = (feature: string) =>
		features.some((value) => value.startsWith(feature));

	const items = await client
		.getDiscoItems(domain)
		.catch(() => ({ type: "items" as const, items: [] }));

	let muc: string | null = null;
	let upload: { jid: string; maxFileSize?: number } | null = null;
	for (const item of items.items ?? []) {
		if (!item.jid) continue;
		const itemInfo = await client.getDiscoInfo(item.jid).catch(() => null);
		if (!itemInfo) continue;
		const itemFeatures: string[] = itemInfo.features ?? [];
		if (
			!muc &&
			itemFeatures.some((feature) =>
				feature.startsWith("http://jabber.org/protocol/muc"),
			)
		) {
			muc = item.jid;
		}
		if (
			!upload &&
			itemFeatures.some((feature) => feature.startsWith("urn:xmpp:http:upload"))
		) {
			upload = { jid: item.jid };
		}
	}

	let externalServices: XmppExternalService[] = [];
	try {
		const services = await client.getServices(domain);
		externalServices = (services.services ?? []).map((service) => ({
			type: service.type,
			host: service.host,
			port: service.port,
		}));
	} catch {
		externalServices = [];
	}

	return {
		domain,
		transport,
		tls,
		mam: has("urn:xmpp:mam"),
		carbons: has("urn:xmpp:carbons"),
		blocking: has("urn:xmpp:blocking"),
		vcard: has("urn:xmpp:vcard4") || has("vcard"),
		pep: has("http://jabber.org/protocol/pubsub"),
		muc,
		upload,
		externalServices,
	};
}
