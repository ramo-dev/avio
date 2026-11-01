export interface XmppExternalService {
	type?: string;
	host?: string;
	port?: number;
}

export interface ServerCapabilities {
	domain: string;
	/** Which transport the client connected with. */
	transport: "websocket" | "bosh";
	/** True when the active WebSocket transport is wss. */
	tls: boolean;
	mam: boolean;
	carbons: boolean;
	blocking: boolean;
	vcard: boolean;
	pep: boolean;
	muc?: string | null;
	upload?: { jid: string; maxFileSize?: number } | null;
	externalServices: XmppExternalService[];
}
