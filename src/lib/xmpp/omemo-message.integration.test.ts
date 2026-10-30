// @vitest-environment node

import { describe, expect, it } from "vitest";
import { OmemoEngine } from "#/lib/omemo/engine";
import { MemoryOmemoPersistence } from "#/lib/omemo/memory-persistence";
import { OmemoMessageCipher } from "#/lib/omemo/message";
import { OmemoKeyStore } from "#/lib/omemo/store";
import { createStanzaAdapter } from "#/lib/xmpp/client";
import type { XmppEvent } from "#/types/store";

const enabled = process.env.XMPP_INTEGRATION === "1";
const websocketUrl =
	process.env.XMPP_WEBSOCKET_URL ?? "ws://localhost:5280/xmpp-websocket";
const SENDER = "ivan@localhost";
const RECIPIENT = "sam@localhost";
const PASSWORD = "bob123";

type OmemoEvent = Extract<XmppEvent, { type: "omemo-message" }>;

function deviceIdFactory(start: number): () => number {
	let next = start;
	return () => {
		const value = next;
		next += 1;
		return value;
	};
}

describe.skipIf(!enabled)("OMEMO message integration", () => {
	it("sends an encrypted stanza that the recipient decrypts", async () => {
		const senderAdapter = createStanzaAdapter();
		const recipientAdapter = createStanzaAdapter();
		const recipientEvents: XmppEvent[] = [];
		recipientAdapter.subscribe((event) => recipientEvents.push(event));

		const baseDeviceId = (Date.now() % 1_000_000_000) + 1;

		try {
			await senderAdapter.connect({
				jid: SENDER,
				password: PASSWORD,
				websocketUrl,
			});
			await recipientAdapter.connect({
				jid: RECIPIENT,
				password: PASSWORD,
				websocketUrl,
			});

			const senderStore = new OmemoKeyStore(
				SENDER,
				new MemoryOmemoPersistence(),
			);
			const recipientStore = new OmemoKeyStore(
				RECIPIENT,
				new MemoryOmemoPersistence(),
			);
			const senderEngine = new OmemoEngine({
				store: senderStore,
				pep: await senderAdapter.getOmemoPep(),
				accountJid: SENDER,
				deviceIdFactory: deviceIdFactory(baseDeviceId),
			});
			const recipientEngine = new OmemoEngine({
				store: recipientStore,
				pep: await recipientAdapter.getOmemoPep(),
				accountJid: RECIPIENT,
				deviceIdFactory: deviceIdFactory(baseDeviceId + 500_000),
			});

			const senderInit = await senderEngine.initialize();
			const recipientInit = await recipientEngine.initialize();

			await waitForValue(async () => {
				try {
					await senderEngine.trustDevice(RECIPIENT, recipientInit.deviceId);
					return true;
				} catch {
					return null;
				}
			}, 10_000);
			await waitForValue(async () => {
				try {
					await recipientEngine.trustDevice(SENDER, senderInit.deviceId);
					return true;
				} catch {
					return null;
				}
			}, 10_000);

			const senderCipher = new OmemoMessageCipher({
				engine: senderEngine,
				store: senderStore,
				accountJid: SENDER,
			});
			const recipientCipher = new OmemoMessageCipher({
				engine: recipientEngine,
				store: recipientStore,
				accountJid: RECIPIENT,
			});

			const plaintext = "integration omemo message";
			const envelope = await senderCipher.encryptMessage(RECIPIENT, plaintext, [
				recipientInit.deviceId,
			]);

			await senderAdapter.sendEncryptedMessage(
				RECIPIENT,
				`omemo-${Date.now()}`,
				envelope,
			);

			const received = await waitForValue(
				() => recipientEvents.find(isOmemoEvent) ?? null,
				10_000,
			);

			expect(received.jid).toBe(SENDER);
			expect(received.direction).toBe("incoming");
			expect(received.from.startsWith(`${SENDER}/`)).toBe(true);
			expect(received.envelope.sid).toBe(senderInit.deviceId);

			const decrypted = await recipientCipher.decryptMessage(
				SENDER,
				received.envelope,
			);

			expect(decrypted.plaintext).toBe(plaintext);
			expect(decrypted.senderJid).toBe(SENDER);
			expect(decrypted.senderDeviceId).toBe(senderInit.deviceId);
			expect(decrypted.trusted).toBe(true);
		} finally {
			await Promise.allSettled([
				senderAdapter.disconnect(),
				recipientAdapter.disconnect(),
			]);
		}
	}, 60_000);
});

function isOmemoEvent(event: XmppEvent): event is OmemoEvent {
	return event.type === "omemo-message";
}

async function waitForValue<T>(
	check: () => T | null | Promise<T | null>,
	timeoutMs: number,
): Promise<T> {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		const value = await check();
		if (value !== null) return value;
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
	throw new Error("Timed out waiting for an OMEMO message");
}
