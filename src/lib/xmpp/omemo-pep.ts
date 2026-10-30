import type { Agent } from "stanza";
import { Constants, Platform } from "stanza";
import {
	NS_OMEMO_AXOLOTL_BUNDLES,
	NS_OMEMO_AXOLOTL_DEVICELIST,
} from "stanza/Namespaces";
import type {
	DataForm,
	OMEMODevice,
	OMEMODeviceList,
	PubsubItemContent,
} from "stanza/protocol";
import { encodeBase64 } from "#/lib/omemo/base64";
import { OmemoPepError, wrapOmemoPepError } from "#/lib/omemo/errors";
import type {
	OmemoPepBundle,
	OmemoPepPreKey,
	OmemoPepTransport,
} from "#/types/omemo";

export const OMEMO_DEVICE_LIST_NODE = NS_OMEMO_AXOLOTL_DEVICELIST;
export const OMEMO_BUNDLE_NODE = NS_OMEMO_AXOLOTL_BUNDLES;
export const OMEMO_PEP_ITEM_ID = "current";

const NODE_CONFIG_FORM_TYPE = "http://jabber.org/protocol/pubsub#node_config";
const NODE_CONFIG_ACCESS_MODEL = "pubsub#access_model";
const NODE_CONFIG_OPEN = "open";

const OPEN_NODE_CONFIG: DataForm = {
	type: Constants.DataFormType.Submit,
	fields: [
		{
			type: Constants.DataFormFieldType.Hidden,
			name: "FORM_TYPE",
			value: NODE_CONFIG_FORM_TYPE,
		},
		{
			type: Constants.DataFormFieldType.List,
			name: NODE_CONFIG_ACCESS_MODEL,
			value: NODE_CONFIG_OPEN,
		},
	],
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isPepId(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function toBase64(value: unknown): string | null {
	if (!ArrayBuffer.isView(value) || value.byteLength === 0) return null;
	const bytes = new Uint8Array(value.byteLength);
	bytes.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
	return encodeBase64(bytes);
}

function toBuffer(value: string) {
	return Platform.Buffer.from(value, "base64");
}

function isItemNotFound(error: unknown): boolean {
	if (!isRecord(error) || !isRecord(error.error)) return false;
	return error.error.condition === "item-not-found";
}

function readDeviceList(content: unknown): number[] {
	if (
		!isRecord(content) ||
		content.itemType !== NS_OMEMO_AXOLOTL_DEVICELIST ||
		!Array.isArray(content.devices)
	) {
		throw new OmemoPepError("invalid-device-list");
	}
	return content.devices.map((deviceId) => {
		if (!isPepId(deviceId)) {
			throw new OmemoPepError("invalid-device-list");
		}
		return deviceId;
	});
}

function readSignedPreKey(value: unknown): {
	id: number;
	publicKey: string;
} {
	if (!isRecord(value) || !isPepId(value.id)) {
		throw new OmemoPepError("invalid-bundle");
	}
	const publicKey = toBase64(value.value);
	if (!publicKey) throw new OmemoPepError("invalid-bundle");
	return { id: value.id, publicKey };
}

function readPreKey(value: unknown): OmemoPepPreKey {
	if (!isRecord(value) || !isPepId(value.id)) {
		throw new OmemoPepError("invalid-bundle");
	}
	const publicKey = toBase64(value.value);
	if (!publicKey) throw new OmemoPepError("invalid-bundle");
	return { id: value.id, publicKey };
}

function readBundle(content: unknown, deviceId: number): OmemoPepBundle {
	if (
		!isRecord(content) ||
		content.itemType !== NS_OMEMO_AXOLOTL_BUNDLES ||
		!Array.isArray(content.preKeys) ||
		content.preKeys.length === 0
	) {
		throw new OmemoPepError("invalid-bundle");
	}

	const identityKey = toBase64(content.identityKey);
	const signedPreKeySignature = toBase64(content.signedPreKeySignature);
	if (!identityKey || !signedPreKeySignature) {
		throw new OmemoPepError("invalid-bundle");
	}
	const signedPreKey = readSignedPreKey(content.signedPreKeyPublic);

	return {
		deviceId,
		identityKey,
		signedPreKeyId: signedPreKey.id,
		signedPreKeyPublic: signedPreKey.publicKey,
		signedPreKeySignature,
		preKeys: content.preKeys.map(readPreKey),
	};
}

export function createStanzaOmemoPep(
	agent: Agent,
	accountJid: string,
): OmemoPepTransport {
	const configuredNodes = new Set<string>();

	async function fetchItem(
		targetJid: string,
		node: string,
	): Promise<{ content: unknown } | null> {
		try {
			const result = await agent.getItems<OMEMODeviceList | OMEMODevice>(
				targetJid,
				node,
				{ max: 1 },
			);
			const item = result.items?.[0];
			return item ? { content: item.content } : null;
		} catch (error) {
			if (isItemNotFound(error)) return null;
			throw wrapOmemoPepError("fetch-failed", error);
		}
	}

	async function publishNode(
		node: string,
		content: PubsubItemContent,
	): Promise<void> {
		try {
			await agent.publish(accountJid, node, content, OMEMO_PEP_ITEM_ID);
		} catch (error) {
			throw wrapOmemoPepError("publish-failed", error);
		}
		if (configuredNodes.has(node)) return;

		try {
			await agent.configureNode(accountJid, node, OPEN_NODE_CONFIG);
			configuredNodes.add(node);
		} catch (error) {
			throw wrapOmemoPepError("configure-failed", error);
		}
	}

	async function publishDeviceList(deviceIds: number[]): Promise<void> {
		const content: OMEMODeviceList = {
			itemType: NS_OMEMO_AXOLOTL_DEVICELIST,
			devices: deviceIds,
		};
		await publishNode(OMEMO_DEVICE_LIST_NODE, content);
	}

	async function fetchDeviceList(targetJid: string): Promise<number[] | null> {
		const item = await fetchItem(targetJid, OMEMO_DEVICE_LIST_NODE);
		if (!item) return null;
		return readDeviceList(item.content);
	}

	async function publishBundle(bundle: OmemoPepBundle): Promise<void> {
		const node = `${OMEMO_BUNDLE_NODE}:${bundle.deviceId}`;
		const content: OMEMODevice = {
			itemType: NS_OMEMO_AXOLOTL_BUNDLES,
			identityKey: toBuffer(bundle.identityKey),
			preKeys: bundle.preKeys.map((preKey) => ({
				id: preKey.id,
				value: toBuffer(preKey.publicKey),
			})),
			signedPreKeyPublic: {
				id: bundle.signedPreKeyId,
				value: toBuffer(bundle.signedPreKeyPublic),
			},
			signedPreKeySignature: toBuffer(bundle.signedPreKeySignature),
		};
		await publishNode(node, content);
	}

	async function fetchBundle(
		targetJid: string,
		deviceId: number,
	): Promise<OmemoPepBundle | null> {
		const node = `${OMEMO_BUNDLE_NODE}:${deviceId}`;
		const item = await fetchItem(targetJid, node);
		if (!item) return null;
		return readBundle(item.content, deviceId);
	}

	async function subscribeToDeviceList(targetJid: string): Promise<void> {
		try {
			const options = {
				node: OMEMO_DEVICE_LIST_NODE,
				useBareJID: true,
			};
			await agent.subscribeToNode(targetJid, options);
		} catch (error) {
			throw wrapOmemoPepError("subscribe-failed", error);
		}
	}

	return {
		publishDeviceList,
		fetchDeviceList,
		publishBundle,
		fetchBundle,
		subscribeToDeviceList,
	};
}
