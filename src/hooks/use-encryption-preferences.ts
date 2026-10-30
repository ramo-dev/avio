import { useCallback, useEffect, useMemo, useState } from "react";
import { createEncryptionPreferenceStore } from "#/lib/storage/encryption-preferences";
import { bareJid } from "#/lib/xmpp/jid";
import type { EncryptionPreference } from "#/types/omemo";

/**
 * Per-chat encryption overrides that survive refresh and reconnects, scoped to
 * the signed-in account. `on`/`off` are explicit choices; absent means the
 * default preference applies.
 */
export function useEncryptionPreferences(accountJid: string | null) {
	const store = useMemo(() => createEncryptionPreferenceStore(), []);
	const [preferences, setPreferences] = useState<
		Record<string, EncryptionPreference>
	>({});

	useEffect(() => {
		setPreferences(accountJid ? store.load(accountJid) : {});
	}, [accountJid, store]);

	const setPreference = useCallback(
		(jid: string, enabled: boolean) => {
			const key = bareJid(jid);
			const preference: EncryptionPreference = enabled ? "on" : "off";
			setPreferences((current) => ({ ...current, [key]: preference }));
			if (accountJid) store.save(accountJid, key, preference);
		},
		[accountJid, store],
	);

	return { preferences, setPreference };
}
