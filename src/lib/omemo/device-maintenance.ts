import type { OmemoEngine } from "#/lib/omemo/engine";
import type { OmemoPepClient } from "#/types/omemo";

/** Safe maintenance: top up pre-keys and republish the current device. */
export async function repairOwnDevice(engine: OmemoEngine): Promise<void> {
	await engine.replenishPreKeys();
	await engine.publishBundle();
	await engine.publishDeviceList();
}

/**
 * Removes a replaced device from the account's PEP list after a reset so
 * contacts cannot keep addressing the old identity. Other devices stay listed.
 */
export async function publishReplacementDevice(
	pep: OmemoPepClient,
	accountJid: string,
	previousDeviceId: number | null,
	currentDeviceId: number | null,
): Promise<void> {
	if (previousDeviceId === null) return;
	const existing = await pep.fetchDeviceList(accountJid);
	if (!existing?.includes(previousDeviceId)) return;
	const next = existing.filter((id) => id !== previousDeviceId);
	if (currentDeviceId !== null && !next.includes(currentDeviceId)) {
		next.push(currentDeviceId);
	}
	if (next.length > 0) await pep.publishDeviceList(next);
}
