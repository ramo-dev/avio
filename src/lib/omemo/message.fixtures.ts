import { decodeBase64 } from "#/lib/omemo/base64";
import { OmemoEngine } from "#/lib/omemo/engine";
import { MemoryOmemoPersistence } from "#/lib/omemo/memory-persistence";
import { OmemoMessageCipher } from "#/lib/omemo/message";
import { OmemoKeyStore } from "#/lib/omemo/store";
import type {
	OmemoEncryptedMessage,
	OmemoPepBundle,
	OmemoPepClient,
} from "#/types/omemo";

export const ALICE = "alice@example.com";
export const BOB = "bob@example.com";
export const ALICE_DEVICE = 1001;
export const BOB_DEVICE = 2002;

export class PepServer {
	private readonly deviceLists = new Map<string, number[]>();
	private readonly bundles = new Map<string, Map<number, OmemoPepBundle>>();

	setDeviceList(accountJid: string, deviceIds: number[]): void {
		this.deviceLists.set(accountJid, [...deviceIds]);
	}

	getDeviceList(accountJid: string): number[] | null {
		const deviceIds = this.deviceLists.get(accountJid);
		return deviceIds ? [...deviceIds] : null;
	}

	getBundle(accountJid: string, deviceId: number): OmemoPepBundle | null {
		const bundle = this.bundles.get(accountJid)?.get(deviceId);
		return bundle ? structuredClone(bundle) : null;
	}

	publishDeviceList(accountJid: string, deviceIds: number[]): void {
		this.deviceLists.set(
			accountJid,
			[...deviceIds].sort((left, right) => left - right),
		);
	}

	publishBundle(accountJid: string, bundle: OmemoPepBundle): void {
		const bundles = this.bundles.get(accountJid) ?? new Map();
		bundles.set(bundle.deviceId, structuredClone(bundle));
		this.bundles.set(accountJid, bundles);
	}
}

class TestPepClient implements OmemoPepClient {
	constructor(
		private readonly server: PepServer,
		private readonly accountJid: string,
	) {}

	async publishDeviceList(deviceIds: number[]): Promise<void> {
		this.server.publishDeviceList(this.accountJid, deviceIds);
	}

	async fetchDeviceList(accountJid: string): Promise<number[] | null> {
		return this.server.getDeviceList(accountJid);
	}

	async publishBundle(bundle: OmemoPepBundle): Promise<void> {
		this.server.publishBundle(this.accountJid, bundle);
	}

	async fetchBundle(
		accountJid: string,
		deviceId: number,
	): Promise<OmemoPepBundle | null> {
		return this.server.getBundle(accountJid, deviceId);
	}

	async subscribeToDeviceList(): Promise<void> {}
}

interface Party {
	store: OmemoKeyStore;
	engine: OmemoEngine;
	cipher: OmemoMessageCipher;
}

async function createParty(
	accountJid: string,
	server: PepServer,
	deviceId: number,
): Promise<Party> {
	const store = new OmemoKeyStore(accountJid, new MemoryOmemoPersistence());
	const engine = new OmemoEngine({
		store,
		pep: new TestPepClient(server, accountJid),
		accountJid,
		deviceIdFactory: () => deviceId,
	});
	const cipher = new OmemoMessageCipher({ engine, store, accountJid });
	await engine.initialize();
	return { store, engine, cipher };
}

export async function createPair(): Promise<{
	server: PepServer;
	alice: Party;
	bob: Party;
}> {
	const server = new PepServer();
	const alice = await createParty(ALICE, server, ALICE_DEVICE);
	const bob = await createParty(BOB, server, BOB_DEVICE);
	return { server, alice, bob };
}

export function bytes(value: string): Uint8Array<ArrayBuffer> {
	const decoded = decodeBase64(value);
	if (!decoded) throw new Error("Expected valid base64");
	return decoded;
}

export function requireKey(
	envelope: OmemoEncryptedMessage,
	rid: number,
): OmemoEncryptedMessage["keys"][number] {
	const key = envelope.keys.find((candidate) => candidate.rid === rid);
	if (!key) throw new Error("Expected a key for the device");
	return key;
}
