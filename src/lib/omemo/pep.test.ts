import { beforeEach, describe, expect, it, vi } from "vitest";
import { OmemoPepError } from "#/lib/omemo/errors";
import { OmemoPep } from "#/lib/omemo/pep";
import type { OmemoPepBundle, OmemoPepTransport } from "#/types/omemo";

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

function createTransport() {
	const publishDeviceList = vi.fn(
		async (_deviceIds: number[]): Promise<void> => undefined,
	);
	const fetchDeviceList = vi.fn(
		async (_accountJid: string): Promise<number[] | null> => null,
	);
	const publishBundle = vi.fn(
		async (_bundle: OmemoPepBundle): Promise<void> => undefined,
	);
	const fetchBundle = vi.fn(
		async (
			_accountJid: string,
			_deviceId: number,
		): Promise<OmemoPepBundle | null> => null,
	);
	const subscribeToDeviceList = vi.fn(
		async (_accountJid: string): Promise<void> => undefined,
	);

	const transport: OmemoPepTransport = {
		publishDeviceList,
		fetchDeviceList,
		publishBundle,
		fetchBundle,
		subscribeToDeviceList,
	};

	return {
		transport,
		publishDeviceList,
		fetchDeviceList,
		publishBundle,
		fetchBundle,
		subscribeToDeviceList,
	};
}

describe("OmemoPep", () => {
	let harness: ReturnType<typeof createTransport>;
	let client: OmemoPep;

	beforeEach(() => {
		harness = createTransport();
		client = new OmemoPep(harness.transport);
	});

	it("deduplicates and sorts device IDs before publishing", async () => {
		await client.publishDeviceList([9, 3, 9, 1, 3]);

		expect(harness.publishDeviceList).toHaveBeenCalledWith([1, 3, 9]);
	});

	it.each([
		0,
		-1,
		1.5,
		0x1_0000_0000,
		Number.NaN,
	])("rejects invalid device ID %s", async (deviceId) => {
		await expect(client.publishDeviceList([deviceId])).rejects.toMatchObject({
			name: "OmemoPepError",
			code: "invalid-device-list",
		});
		expect(harness.publishDeviceList).not.toHaveBeenCalled();
	});

	it("publishes a valid bundle", async () => {
		await client.publishBundle(VALID_BUNDLE);

		expect(harness.publishBundle).toHaveBeenCalledWith(VALID_BUNDLE);
	});

	it.each([
		[
			"invalid identity base64",
			(bundle: OmemoPepBundle) => ({ ...bundle, identityKey: "not base64!" }),
		],
		[
			"empty signed pre-key public key",
			(bundle: OmemoPepBundle) => ({ ...bundle, signedPreKeyPublic: "" }),
		],
		[
			"empty signed pre-key signature",
			(bundle: OmemoPepBundle) => ({ ...bundle, signedPreKeySignature: "" }),
		],
		[
			"invalid device ID",
			(bundle: OmemoPepBundle) => ({ ...bundle, deviceId: 0 }),
		],
		[
			"invalid signed pre-key ID",
			(bundle: OmemoPepBundle) => ({ ...bundle, signedPreKeyId: -1 }),
		],
		[
			"empty pre-keys",
			(bundle: OmemoPepBundle) => ({ ...bundle, preKeys: [] }),
		],
		[
			"duplicate pre-key IDs",
			(bundle: OmemoPepBundle) => ({
				...bundle,
				preKeys: [
					{ id: 1, publicKey: "CgsM" },
					{ id: 1, publicKey: "DQ4P" },
				],
			}),
		],
		[
			"invalid pre-key base64",
			(bundle: OmemoPepBundle) => ({
				...bundle,
				preKeys: [{ id: 1, publicKey: "%%%" }],
			}),
		],
		[
			"invalid pre-key ID",
			(bundle: OmemoPepBundle) => ({
				...bundle,
				preKeys: [{ id: 0, publicKey: "CgsM" }],
			}),
		],
	])("rejects a bundle with %s", async (_label, mutate) => {
		await expect(
			client.publishBundle(mutate(VALID_BUNDLE)),
		).rejects.toMatchObject({
			name: "OmemoPepError",
			code: "invalid-bundle",
		});
		expect(harness.publishBundle).not.toHaveBeenCalled();
	});

	it("returns null when a device list is missing", async () => {
		await expect(client.fetchDeviceList("alice@example.com")).resolves.toBe(
			null,
		);
	});

	it("returns null when a bundle is missing", async () => {
		await expect(client.fetchBundle("alice@example.com", 4242)).resolves.toBe(
			null,
		);
	});

	it("normalizes a fetched device list", async () => {
		harness.fetchDeviceList.mockResolvedValue([5, 2, 5]);

		await expect(client.fetchDeviceList("alice@example.com")).resolves.toEqual([
			2, 5,
		]);
	});

	it("rejects a malformed fetched device list", async () => {
		harness.fetchDeviceList.mockResolvedValue(["2"] as unknown as number[]);

		await expect(
			client.fetchDeviceList("alice@example.com"),
		).rejects.toMatchObject({ code: "invalid-device-list" });
	});

	it("rejects a malformed fetched bundle", async () => {
		harness.fetchBundle.mockResolvedValue({ ...VALID_BUNDLE, preKeys: [] });

		await expect(
			client.fetchBundle("alice@example.com", 4242),
		).rejects.toMatchObject({ code: "invalid-bundle" });
	});

	it("rejects a fetched bundle for a different device", async () => {
		harness.fetchBundle.mockResolvedValue({ ...VALID_BUNDLE, deviceId: 99 });

		await expect(
			client.fetchBundle("alice@example.com", 4242),
		).rejects.toMatchObject({ code: "invalid-bundle" });
	});

	it("rejects invalid account JIDs before fetching", async () => {
		await expect(client.fetchDeviceList("not-a-jid")).rejects.toMatchObject({
			code: "invalid-account",
		});
		await expect(
			client.fetchDeviceList("alice@example.com/phone"),
		).rejects.toMatchObject({
			code: "invalid-account",
		});
		await expect(client.subscribeToDeviceList("")).rejects.toMatchObject({
			code: "invalid-account",
		});
		expect(harness.fetchDeviceList).not.toHaveBeenCalled();
		expect(harness.subscribeToDeviceList).not.toHaveBeenCalled();
	});

	it("wraps publish failures as typed PEP errors", async () => {
		harness.publishDeviceList.mockRejectedValue(new Error("device list"));
		harness.publishBundle.mockRejectedValue(new Error("bundle"));

		await expect(client.publishDeviceList([1])).rejects.toMatchObject({
			code: "publish-failed",
		});
		await expect(client.publishBundle(VALID_BUNDLE)).rejects.toMatchObject({
			code: "publish-failed",
		});
	});

	it("wraps fetch failures as typed PEP errors", async () => {
		harness.fetchDeviceList.mockRejectedValue(new Error("device list"));
		harness.fetchBundle.mockRejectedValue(new Error("bundle"));

		await expect(
			client.fetchDeviceList("alice@example.com"),
		).rejects.toMatchObject({ code: "fetch-failed" });
		await expect(
			client.fetchBundle("alice@example.com", 4242),
		).rejects.toMatchObject({ code: "fetch-failed" });
	});

	it("wraps subscribe failures as typed PEP errors", async () => {
		harness.subscribeToDeviceList.mockRejectedValue(new Error("subscribe"));

		await expect(
			client.subscribeToDeviceList("alice@example.com"),
		).rejects.toMatchObject({ code: "subscribe-failed" });
	});

	it("preserves an existing PEP error from the transport", async () => {
		const original = new OmemoPepError("invalid-bundle");
		harness.fetchBundle.mockRejectedValue(original);

		await expect(client.fetchBundle("alice@example.com", 4242)).rejects.toBe(
			original,
		);
	});
});
