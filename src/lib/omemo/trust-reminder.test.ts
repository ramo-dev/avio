import { describe, expect, it } from "vitest";
import {
	shouldRemindTrust,
	trustReminderSignature,
	untrustedDeviceIds,
} from "#/lib/omemo/trust-reminder";
import type { OmemoDeviceInfo } from "#/types/omemo";

function device(deviceId: number, trusted: boolean): OmemoDeviceInfo {
	return {
		deviceId,
		fingerprint: `fingerprint-${deviceId}`,
		trusted,
	};
}

describe("untrustedDeviceIds", () => {
	it("returns sorted IDs for devices without trust", () => {
		expect(
			untrustedDeviceIds([
				device(30, false),
				device(10, true),
				device(20, false),
			]),
		).toEqual([20, 30]);
	});
});

describe("trustReminderSignature", () => {
	it("is empty when every device is trusted", () => {
		expect(trustReminderSignature([device(10, true)])).toBe("");
	});

	it("changes when a new untrusted device appears", () => {
		const before = trustReminderSignature([device(10, false)]);
		const after = trustReminderSignature([
			device(10, false),
			device(11, false),
		]);
		expect(after).not.toBe(before);
	});
});

describe("shouldRemindTrust", () => {
	it("never reminds without untrusted devices", () => {
		expect(shouldRemindTrust("", null)).toBe(false);
	});

	it("reminds for a new signature", () => {
		expect(shouldRemindTrust("10", null)).toBe(true);
		expect(shouldRemindTrust("10,11", "10")).toBe(true);
	});

	it("stays quiet for the signature the user already saw", () => {
		expect(shouldRemindTrust("10", "10")).toBe(false);
	});
});
