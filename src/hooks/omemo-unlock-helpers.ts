import { toast } from "react-hot-toast";
import type { OmemoAccount } from "#/lib/omemo/account";
import type { OmemoUnlockSecret } from "#/types/omemo";
import type { OmemoUnlockStore } from "#/types/storage";

export function forgetRememberedUnlock(
	store: OmemoUnlockStore,
	accountJid: string,
) {
	store.clear(accountJid).catch(() => {
		toast.error("Could not clear the remembered OMEMO unlock on this device.", {
			id: "omemo-unlock-clear",
		});
	});
}

export async function rememberUnlockKey(
	store: OmemoUnlockStore,
	accountJid: string,
	key: CryptoKey,
) {
	try {
		await store.save(accountJid, { type: "key", key });
	} catch {
		toast.error("Could not remember OMEMO unlock on this device.", {
			id: "omemo-unlock-remember",
		});
	}
}

/**
 * Unlocks with a remembered key. Returns false when nothing usable is stored,
 * so the caller falls back to the passphrase prompt.
 */
export async function restoreRememberedUnlock(
	account: OmemoAccount,
	store: OmemoUnlockStore,
	accountJid: string,
): Promise<boolean> {
	let secret: OmemoUnlockSecret | null;
	try {
		secret = await store.load(accountJid);
	} catch {
		return false;
	}
	if (!secret) return false;

	try {
		await account.unlockWithKey(secret.key);
		// Refresh the TTL so an actively used remembered key does not expire
		// mid-session; a force-closed tab still expires after 24 hours.
		await store.save(accountJid, secret).catch(() => undefined);
		return true;
	} catch {
		forgetRememberedUnlock(store, accountJid);
		await account.probe().catch(() => undefined);
		return false;
	}
}
