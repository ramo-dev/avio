import type { OmemoDeviceInfo } from "#/types/omemo";

/** IDs of peer devices that still need a trust decision, sorted for stability. */
export function untrustedDeviceIds(devices: OmemoDeviceInfo[]): number[] {
	return devices
		.filter((device) => !device.trusted)
		.map((device) => device.deviceId)
		.sort((a, b) => a - b);
}

/**
 * Stable signature of the untrusted devices. Storing it lets the reminder stay
 * quiet for devices the user already saw, and appear again for a new one.
 */
export function trustReminderSignature(devices: OmemoDeviceInfo[]): string {
	return untrustedDeviceIds(devices).join(",");
}

export function shouldRemindTrust(
	signature: string,
	remembered: string | null,
): boolean {
	return signature.length > 0 && signature !== remembered;
}
