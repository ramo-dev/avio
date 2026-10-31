import type { Agent } from "stanza";
import type { DataForm } from "stanza/protocol";
import { describe, expect, it, vi } from "vitest";
import { encodeBase64 } from "#/lib/omemo/base64";
import { createStanzaOmemoPep } from "#/lib/xmpp/omemo-pep";
import type { OmemoPepBundle } from "#/types/omemo";

const ACCOUNT = "phiey@localhost";
const DEVICE_LIST_NODE = "eu.siacs.conversations.axolotl.devicelist";
const BUNDLE_NODE = "eu.siacs.conversations.axolotl.bundles:4242";
const BUNDLE_NAMESPACE = "eu.siacs.conversations.axolotl.bundles";
const DEVICE_LIST_NAMESPACE = "eu.siacs.conversations.axolotl.devicelist";

const VALID_BUNDLE: OmemoPepBundle = {
	deviceId: 4242,
	identityKey: "AQID",
	signedPreKeyId: 7,
	signedPreKeyPublic: "BAUG",
	signedPreKeySignature: "BwgJ",
	preKeys: [
		{ id: 1, publicKey: "CgsM" },
		{ id: 2, publicKey: "DQ4P" },
	],
};

const IDENTITY = new Uint8Array([1, 2, 3]);
const SIGNED_PRE_KEY = new Uint8Array([4, 5, 6]);
const SIGNATURE = new Uint8Array([7, 8, 9]);
const PRE_KEY_ONE = new Uint8Array([10, 11, 12]);
const PRE_KEY_TWO = new Uint8Array([13, 14, 15]);

function createAgent() {
	const publish = vi.fn(
		async (
			_jid: string,
			_node: string,
			_item: unknown,
			_id: string,
		): Promise<unknown> => ({}),
	);
	const getItems = vi.fn(
		async (
			_jid: string,
			_node: string,
			_opts?: { max?: number },
		): Promise<{ items?: Array<{ content?: unknown }> }> => ({ items: [] }),
	);
	const configureNode = vi.fn(
		async (
			_jid: string,
			_node: string,
			_form: DataForm,
		): Promise<unknown> => ({}),
	);
	const subscribeToNode = vi.fn(
		async (
			_jid: string,
			_opts: { node?: string; useBareJID?: boolean },
		): Promise<unknown> => ({}),
	);

	const agent = {
		publish,
		getItems,
		configureNode,
		subscribeToNode,
	} as unknown as Agent;

	return { agent, publish, getItems, configureNode, subscribeToNode };
}

function bytesFromBase64(value: string): number[] {
	return Array.from(atob(value), (character) => character.charCodeAt(0));
}

function bytes(value: unknown): number[] {
	if (!ArrayBuffer.isView(value)) {
		throw new Error("Expected a byte buffer");
	}
	return Array.from(
		new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
	);
}

describe("createStanzaOmemoPep", () => {
	it("publishes the legacy device list with item id current", async () => {
		const { agent, publish, configureNode } = createAgent();
		const transport = createStanzaOmemoPep(agent, ACCOUNT);

		await transport.publishDeviceList([1, 2]);

		expect(publish).toHaveBeenCalledTimes(1);
		const [jid, node, content, itemId] = publish.mock.calls[0] ?? [];
		expect(jid).toBe(ACCOUNT);
		expect(node).toBe(DEVICE_LIST_NODE);
		expect(itemId).toBe("current");
		expect(content).toEqual({
			itemType: DEVICE_LIST_NAMESPACE,
			devices: [1, 2],
		});

		const [configJid, configNode, form] = configureNode.mock.calls[0] ?? [];
		expect(configJid).toBe(ACCOUNT);
		expect(configNode).toBe(DEVICE_LIST_NODE);
		expect(form.fields).toContainEqual({
			type: "hidden",
			name: "FORM_TYPE",
			value: "http://jabber.org/protocol/pubsub#node_config",
		});
		expect(form.fields).toContainEqual({
			type: "list-single",
			name: "pubsub#access_model",
			value: "open",
		});

		await transport.publishDeviceList([1, 2, 3]);
		expect(publish).toHaveBeenCalledTimes(2);
		expect(configureNode).toHaveBeenCalledTimes(1);
	});

	it("publishes a legacy bundle with base64 decoded key material", async () => {
		const { agent, publish } = createAgent();
		const transport = createStanzaOmemoPep(agent, ACCOUNT);

		await transport.publishBundle(VALID_BUNDLE);

		const [, node, rawContent, itemId] = publish.mock.calls[0] ?? [];
		expect(node).toBe(BUNDLE_NODE);
		expect(itemId).toBe("current");

		const content = rawContent as {
			itemType?: unknown;
			identityKey?: unknown;
			preKeys?: Array<{ id?: unknown; value?: unknown }>;
			signedPreKeyPublic?: { id?: unknown; value?: unknown };
			signedPreKeySignature?: unknown;
		};
		expect(content.itemType).toBe(BUNDLE_NAMESPACE);
		expect(bytes(content.identityKey)).toEqual(
			bytesFromBase64(VALID_BUNDLE.identityKey),
		);
		expect(bytes(content.signedPreKeyPublic?.value)).toEqual(
			bytesFromBase64(VALID_BUNDLE.signedPreKeyPublic),
		);
		expect(bytes(content.signedPreKeySignature)).toEqual(
			bytesFromBase64(VALID_BUNDLE.signedPreKeySignature),
		);
		expect(content.signedPreKeyPublic?.id).toBe(7);
		expect(content.preKeys?.map((preKey) => preKey.id)).toEqual([1, 2]);
		expect(bytes(content.preKeys?.[0]?.value)).toEqual(
			bytesFromBase64(VALID_BUNDLE.preKeys[0]?.publicKey ?? ""),
		);
	});

	it("fetches and normalizes a device list", async () => {
		const { agent, getItems } = createAgent();
		getItems.mockResolvedValue({
			items: [
				{
					content: {
						itemType: DEVICE_LIST_NAMESPACE,
						devices: [11, 22],
					},
				},
			],
		});
		const transport = createStanzaOmemoPep(agent, ACCOUNT);

		await expect(transport.fetchDeviceList(ACCOUNT)).resolves.toEqual([11, 22]);
		expect(getItems).toHaveBeenCalledWith(ACCOUNT, DEVICE_LIST_NODE, {
			max: 1,
		});
	});

	it("fetches and normalizes a bundle", async () => {
		const { agent, getItems } = createAgent();
		getItems.mockResolvedValue({
			items: [
				{
					content: {
						itemType: BUNDLE_NAMESPACE,
						identityKey: IDENTITY,
						preKeys: [
							{ id: 1, value: PRE_KEY_ONE },
							{ id: 2, value: PRE_KEY_TWO },
						],
						signedPreKeyPublic: { id: 7, value: SIGNED_PRE_KEY },
						signedPreKeySignature: SIGNATURE,
					},
				},
			],
		});
		const transport = createStanzaOmemoPep(agent, ACCOUNT);

		await expect(transport.fetchBundle(ACCOUNT, 4242)).resolves.toEqual({
			deviceId: 4242,
			identityKey: encodeBase64(IDENTITY),
			signedPreKeyId: 7,
			signedPreKeyPublic: encodeBase64(SIGNED_PRE_KEY),
			signedPreKeySignature: encodeBase64(SIGNATURE),
			preKeys: [
				{ id: 1, publicKey: encodeBase64(PRE_KEY_ONE) },
				{ id: 2, publicKey: encodeBase64(PRE_KEY_TWO) },
			],
		});
	});

	it("returns null when the node is missing", async () => {
		const { agent, getItems } = createAgent();
		getItems.mockRejectedValue({ error: { condition: "item-not-found" } });
		const transport = createStanzaOmemoPep(agent, ACCOUNT);

		await expect(transport.fetchDeviceList(ACCOUNT)).resolves.toBe(null);
		await expect(transport.fetchBundle(ACCOUNT, 4242)).resolves.toBe(null);
	});

	it.each([
		["missing devices", { itemType: DEVICE_LIST_NAMESPACE }],
		["the wrong item type", { itemType: BUNDLE_NAMESPACE, devices: [1] }],
	])("rejects a device list with %s", async (_label, content) => {
		const { agent, getItems } = createAgent();
		getItems.mockResolvedValue({ items: [{ content }] });
		const transport = createStanzaOmemoPep(agent, ACCOUNT);

		await expect(transport.fetchDeviceList(ACCOUNT)).rejects.toMatchObject({
			code: "invalid-device-list",
		});
	});

	it.each([
		[
			"no pre-keys",
			{
				itemType: BUNDLE_NAMESPACE,
				identityKey: IDENTITY,
				preKeys: [],
				signedPreKeyPublic: { id: 7, value: SIGNED_PRE_KEY },
				signedPreKeySignature: SIGNATURE,
			},
		],
		[
			"the wrong item type",
			{ itemType: DEVICE_LIST_NAMESPACE, identityKey: IDENTITY },
		],
	])("rejects a bundle with %s", async (_label, content) => {
		const { agent, getItems } = createAgent();
		getItems.mockResolvedValue({ items: [{ content }] });
		const transport = createStanzaOmemoPep(agent, ACCOUNT);

		await expect(transport.fetchBundle(ACCOUNT, 4242)).rejects.toMatchObject({
			code: "invalid-bundle",
		});
	});

	it("subscribes to the device list using the bare JID", async () => {
		const { agent, subscribeToNode } = createAgent();
		const transport = createStanzaOmemoPep(agent, ACCOUNT);

		await transport.subscribeToDeviceList("james@localhost");

		expect(subscribeToNode).toHaveBeenCalledWith("james@localhost", {
			node: DEVICE_LIST_NODE,
			useBareJID: true,
		});
	});

	it("maps transport failures to typed PEP errors", async () => {
		const { agent, publish, getItems, configureNode, subscribeToNode } =
			createAgent();
		const transport = createStanzaOmemoPep(agent, ACCOUNT);

		publish.mockRejectedValueOnce(new Error("publish"));
		await expect(transport.publishDeviceList([1])).rejects.toMatchObject({
			code: "publish-failed",
		});

		configureNode.mockRejectedValueOnce(new Error("configure"));
		await expect(transport.publishDeviceList([1])).rejects.toMatchObject({
			code: "configure-failed",
		});

		getItems.mockRejectedValueOnce(new Error("fetch"));
		await expect(transport.fetchDeviceList(ACCOUNT)).rejects.toMatchObject({
			code: "fetch-failed",
		});

		subscribeToNode.mockRejectedValueOnce(new Error("subscribe"));
		await expect(
			transport.subscribeToDeviceList(ACCOUNT),
		).rejects.toMatchObject({ code: "subscribe-failed" });
	});
});
