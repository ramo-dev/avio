import { OmemoAccount } from "#/lib/omemo/account";
import { MemoryOmemoEnvelopePersistence } from "#/lib/omemo/memory-persistence";
import type { OmemoPepBundle, OmemoPepClient } from "#/types/omemo";

export const ALICE = "alice@example.com";
export const BOB = "bob@example.com";
export const PASSPHRASE = "correct horse battery staple";
export const WRONG_PASSPHRASE = "incorrect horse battery staple";
export const NEW_PASSPHRASE = "a fresh orange battery";

export class PepServer {
	private readonly deviceLists = new Map<string, number[]>();
	private readonly bundles = new Map<string, Map<number, OmemoPepBundle>>();

	publishDeviceList(accountJid: string, deviceIds: number[]): void {
		this.deviceLists.set(
			accountJid,
			[...deviceIds].sort((left, right) => left - right),
		);
	}

	getDeviceList(accountJid: string): number[] | null {
		const deviceIds = this.deviceLists.get(accountJid);
		return deviceIds ? [...deviceIds] : null;
	}

	publishBundle(accountJid: string, bundle: OmemoPepBundle): void {
		const bundles = this.bundles.get(accountJid) ?? new Map();
		bundles.set(bundle.deviceId, structuredClone(bundle));
		this.bundles.set(accountJid, bundles);
	}

	getBundle(accountJid: string, deviceId: number): OmemoPepBundle | null {
		const bundle = this.bundles.get(accountJid)?.get(deviceId);
		return bundle ? structuredClone(bundle) : null;
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

export function createAccount(
	accountJid: string,
	server: PepServer,
	raw: MemoryOmemoEnvelopePersistence,
): OmemoAccount {
	return new OmemoAccount({
		accountJid,
		pep: new TestPepClient(server, accountJid),
		raw,
	});
}

export async function createReadyPair(): Promise<{
	server: PepServer;
	raw: MemoryOmemoEnvelopePersistence;
	alice: OmemoAccount;
	bob: OmemoAccount;
}> {
	const server = new PepServer();
	const raw = new MemoryOmemoEnvelopePersistence();
	const alice = createAccount(ALICE, server, raw);
	const bob = createAccount(BOB, server, raw);
	await alice.setup(PASSPHRASE);
	await bob.setup(PASSPHRASE);
	return { server, raw, alice, bob };
}

export function requireDeviceId(account: OmemoAccount): number {
	if (account.deviceId === null) throw new Error("Expected a device ID");
	return account.deviceId;
}
