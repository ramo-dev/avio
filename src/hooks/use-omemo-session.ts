import {
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "react-hot-toast";
import {
	forgetRememberedUnlock,
	rememberUnlockKey,
	restoreRememberedUnlock,
} from "#/hooks/omemo-unlock-helpers";
import { useOmemoIdleLock } from "#/hooks/use-omemo-idle-lock";
import { OmemoAccount } from "#/lib/omemo/account";
import { omemoErrorMessage } from "#/lib/omemo/errors";
import { createOmemoUnlockStore } from "#/lib/storage/omemo-unlock-key";
import type { OmemoAccountStatus } from "#/types/omemo";
import type { XmppStore } from "#/types/store";
import type { ConnectionStatus } from "#/types/xmpp";

export interface OmemoSession {
	accountRef: RefObject<OmemoAccount | null>;
	status: OmemoAccountStatus;
	deviceId: number | null;
	fingerprint: string | null;
	error: string | null;
	setup(passphrase: string): Promise<boolean>;
	unlock(passphrase: string): Promise<boolean>;
	repair(): Promise<boolean>;
	reset(passphrase: string): Promise<boolean>;
	lock(): void;
	resetIdle(): void;
}

interface OmemoSessionOptions {
	store: XmppStore;
	accountJid: string | null;
	connectionStatus: ConnectionStatus;
	rememberUnlock: boolean;
}

/** Creates, probes, unlocks, and locks the account-scoped OMEMO session. */
export function useOmemoSession({
	store,
	accountJid,
	connectionStatus,
	rememberUnlock,
}: OmemoSessionOptions): OmemoSession {
	const accountRef = useRef<OmemoAccount | null>(null);
	const unlockKeys = useMemo(() => createOmemoUnlockStore(), []);
	const remember = useRef(rememberUnlock);
	const previousAccount = useRef<string | null>(null);
	const [status, setStatus] = useState<OmemoAccountStatus>("disabled");
	const [deviceId, setDeviceId] = useState<number | null>(null);
	const [fingerprint, setFingerprint] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		unlockKeys.clearLegacyPassphrases();
	}, [unlockKeys]);

	useEffect(() => {
		remember.current = rememberUnlock;
		if (!rememberUnlock && accountJid) {
			forgetRememberedUnlock(unlockKeys, accountJid);
		}
	}, [accountJid, rememberUnlock, unlockKeys]);

	useEffect(() => {
		const previous = previousAccount.current;
		if (!accountJid && previous) forgetRememberedUnlock(unlockKeys, previous);
		previousAccount.current = accountJid;
	}, [accountJid, unlockKeys]);

	const clear = useCallback(() => {
		accountRef.current?.lock();
		setStatus("disabled");
		setDeviceId(null);
		setFingerprint(null);
		setError(null);
	}, []);

	const handleAutoLock = useCallback(() => {
		const account = accountRef.current;
		if (!account || account.status !== "ready") return;
		account.lock();
		forgetRememberedUnlock(unlockKeys, account.accountJid);
		setStatus(account.status);
		setDeviceId(null);
		setFingerprint(null);
		setError(null);
		toast("OMEMO locked after 10 minutes of inactivity.", {
			id: "omemo-auto-lock",
		});
	}, [unlockKeys]);

	const resetIdle = useOmemoIdleLock(status === "ready", handleAutoLock);

	useEffect(() => {
		if (!accountJid || connectionStatus !== "connected") {
			clear();
			return;
		}

		let cancelled = false;
		const connectedAccountJid = accountJid;
		async function loadAccount() {
			try {
				const pep = await store.getOmemoPep();
				if (cancelled) return;
				const account = new OmemoAccount({
					accountJid: connectedAccountJid,
					pep,
				});
				accountRef.current = account;
				const mode = await account.probe();
				if (cancelled) return;
				if (mode === "locked" && remember.current) {
					const restored = await restoreRememberedUnlock(
						account,
						unlockKeys,
						connectedAccountJid,
					);
					if (cancelled) return;
					if (restored) {
						setDeviceId(account.deviceId);
						setFingerprint(await account.localFingerprint());
						if (cancelled) return;
						setStatus("ready");
						setError(null);
						resetIdle();
						return;
					}
				}
				setStatus(mode);
				setError(null);
			} catch (cause) {
				if (cancelled) return;
				setStatus("error");
				setError(
					omemoErrorMessage(cause, "OMEMO is unavailable for this account."),
				);
			}
		}
		void loadAccount();

		return () => {
			cancelled = true;
			const current = accountRef.current;
			accountRef.current = null;
			current?.lock();
		};
	}, [accountJid, clear, connectionStatus, resetIdle, store, unlockKeys]);

	const refreshIdentity = useCallback(async (account: OmemoAccount) => {
		setDeviceId(account.deviceId);
		setFingerprint(await account.localFingerprint());
	}, []);

	const setup = useCallback(
		async (passphrase: string) => {
			const account = accountRef.current;
			if (!account) return false;
			setStatus("unlocking");
			setError(null);
			try {
				const key = await account.setup(passphrase);
				await refreshIdentity(account);
				if (remember.current) {
					await rememberUnlockKey(unlockKeys, account.accountJid, key);
				} else {
					forgetRememberedUnlock(unlockKeys, account.accountJid);
				}
				setStatus("ready");
				resetIdle();
				return true;
			} catch (cause) {
				await account.probe().catch(() => undefined);
				setStatus(account.status);
				setError(
					omemoErrorMessage(cause, "OMEMO setup could not be completed."),
				);
				toast.error(
					omemoErrorMessage(cause, "OMEMO setup could not be completed."),
					{ id: "omemo-setup" },
				);
				return false;
			}
		},
		[refreshIdentity, resetIdle, unlockKeys],
	);

	const unlock = useCallback(
		async (passphrase: string) => {
			const account = accountRef.current;
			if (!account) return false;
			setStatus("unlocking");
			setError(null);
			try {
				const key = await account.unlock(passphrase);
				await refreshIdentity(account);
				if (remember.current) {
					await rememberUnlockKey(unlockKeys, account.accountJid, key);
				} else {
					forgetRememberedUnlock(unlockKeys, account.accountJid);
				}
				setStatus("ready");
				resetIdle();
				return true;
			} catch (cause) {
				await account.probe().catch(() => undefined);
				setStatus(account.status);
				setError(omemoErrorMessage(cause, "OMEMO could not be unlocked."));
				toast.error(omemoErrorMessage(cause, "OMEMO could not be unlocked."), {
					id: "omemo-unlock",
				});
				return false;
			}
		},
		[refreshIdentity, resetIdle, unlockKeys],
	);

	const repair = useCallback(async () => {
		const account = accountRef.current;
		if (!account || account.status !== "ready") return false;
		try {
			await account.repair();
			resetIdle();
			return true;
		} catch (cause) {
			toast.error(
				omemoErrorMessage(cause, "OMEMO key repair could not be completed."),
				{ id: "omemo-repair" },
			);
			return false;
		}
	}, [resetIdle]);

	const reset = useCallback(
		async (passphrase: string) => {
			const account = accountRef.current;
			if (!account) return false;
			setStatus("unlocking");
			setError(null);
			try {
				await unlockKeys.clear(account.accountJid).catch(() => undefined);
				const key = await account.reset(passphrase);
				await refreshIdentity(account);
				if (remember.current) {
					await rememberUnlockKey(unlockKeys, account.accountJid, key);
				}
				setStatus("ready");
				resetIdle();
				return true;
			} catch (cause) {
				setStatus(account.status);
				setError(omemoErrorMessage(cause, "OMEMO could not be reinitialized."));
				toast.error(
					omemoErrorMessage(cause, "OMEMO could not be reinitialized."),
					{ id: "omemo-reset" },
				);
				return false;
			}
		},
		[refreshIdentity, resetIdle, unlockKeys],
	);

	const lock = useCallback(() => {
		const account = accountRef.current;
		if (!account) return;
		account.lock();
		forgetRememberedUnlock(unlockKeys, account.accountJid);
		setStatus(account.status);
		setDeviceId(null);
		setFingerprint(null);
		setError(null);
	}, [unlockKeys]);

	return {
		accountRef,
		status,
		deviceId,
		fingerprint,
		error,
		setup,
		unlock,
		repair,
		reset,
		lock,
		resetIdle,
	};
}
