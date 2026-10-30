import { describe, expect, it } from "vitest";
import { createStanzaAdapter } from "#/lib/xmpp/client";
import type { OmemoPepBundle } from "#/types/omemo";

const enabled = process.env.XMPP_INTEGRATION === "1";
const websocketUrl =
	process.env.XMPP_WEBSOCKET_URL ?? "ws://localhost:5280/xmpp-websocket";
const PUBLISHER = "phiey@localhost";
const READER = "james@localhost";
const PASSWORD = "bob123";

describe.skipIf(!enabled)("OMEMO PEP integration", () => {
	it("publishes and fetches a legacy device list and bundle", async () => {
		const publisherAdapter = createStanzaAdapter();
		const readerAdapter = createStanzaAdapter();
		const deviceId = (Date.now() % 1_000_000_000) + 1;
		const bundle: OmemoPepBundle = {
			deviceId,
			identityKey: "AQID",
			signedPreKeyId: 7,
			signedPreKeyPublic: "BAUG",
			signedPreKeySignature: "BwgJ",
			preKeys: [
				{ id: 1, publicKey: "CgsM" },
				{ id: 2, publicKey: "DQ4P" },
			],
		};

		try {
			await publisherAdapter.connect({
				jid: PUBLISHER,
				password: PASSWORD,
				websocketUrl,
			});
			await readerAdapter.connect({
				jid: READER,
				password: PASSWORD,
				websocketUrl,
			});

			const publisher = await publisherAdapter.getOmemoPep();
			const reader = await readerAdapter.getOmemoPep();

			await publisher.publishDeviceList([deviceId]);
			await publisher.publishBundle(bundle);

			const fetchedDevices = await waitForValue(async () => {
				const deviceIds = await reader.fetchDeviceList(PUBLISHER);
				return deviceIds?.includes(deviceId) ? deviceIds : null;
			}, 10_000);
			expect(fetchedDevices).toEqual([deviceId]);

			const fetchedBundle = await waitForValue(
				() => reader.fetchBundle(PUBLISHER, deviceId),
				10_000,
			);
			expect(fetchedBundle).toEqual(bundle);
		} finally {
			await Promise.allSettled([
				publisherAdapter.disconnect(),
				readerAdapter.disconnect(),
			]);
		}
	}, 30_000);
});

async function waitForValue<T>(
	check: () => Promise<T | null>,
	timeoutMs: number,
): Promise<T> {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		const value = await check();
		if (value !== null) return value;
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error("Timed out waiting for OMEMO PEP propagation");
}
