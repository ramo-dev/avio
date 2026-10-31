import type { OmemoEngine } from "#/lib/omemo/engine";
import { fingerprintFromBase64 } from "#/lib/omemo/fingerprint";
import { bareJid } from "#/lib/xmpp/jid";
import type { OmemoDeviceInfo, OmemoPepClient } from "#/types/omemo";

/** Lists published devices with fingerprints and local trust state. */
export async function listAccountDevices(
	engine: OmemoEngine,
	pep: OmemoPepClient,
	jid: string,
): Promise<OmemoDeviceInfo[]> {
	const target = bareJid(jid);
	const deviceIds = await pep.fetchDeviceList(target);
	if (!deviceIds) return [];

	const devices: OmemoDeviceInfo[] = [];
	for (const deviceId of deviceIds) {
		let bundle: Awaited<ReturnType<OmemoPepClient["fetchBundle"]>>;
		try {
			bundle = await pep.fetchBundle(target, deviceId);
		} catch {
			continue;
		}
		if (!bundle) continue;
		const fingerprint = await fingerprintFromBase64(bundle.identityKey);
		if (!fingerprint) continue;
		devices.push({
			deviceId,
			fingerprint,
			trusted: await engine.isTrustedDevice(target, deviceId),
		});
	}
	return devices;
}
