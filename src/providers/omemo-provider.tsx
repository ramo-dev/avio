import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
} from "react";
import { toast } from "react-hot-toast";
import { useEncryptionPreferences } from "#/hooks/use-encryption-preferences";
import { useOmemoRetryMessages } from "#/hooks/use-omemo-retry";
import { useOmemoSession } from "#/hooks/use-omemo-session";
import { useSettings } from "#/hooks/use-settings";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";
import { OmemoStorageError, omemoErrorMessage } from "#/lib/omemo/errors";
import { createIncomingEncryptedMessage } from "#/lib/omemo/incoming";
import { bareJid } from "#/lib/xmpp/jid";
import { useXmppStore } from "#/providers/xmpp-provider";
import type { ChatMessage } from "#/types/chat";
import type { OmemoAccountStatus, OmemoDeviceInfo } from "#/types/omemo";
import type { XmppEvent } from "#/types/store";

type OmemoMessageEvent = Extract<XmppEvent, { type: "omemo-message" }>;

export interface OmemoContextValue {
	status: OmemoAccountStatus;
	deviceId: number | null;
	fingerprint: string | null;
	error: string | null;
	setup(passphrase: string): Promise<boolean>;
	unlock(passphrase: string): Promise<boolean>;
	repair(): Promise<boolean>;
	reset(passphrase: string): Promise<boolean>;
	lock(): void;
	isEncryptionEnabled(jid: string): boolean;
	/** Whether encryption should be on for this chat, ignoring account state. */
	isEncryptionIntended(jid: string): boolean;
	setEncryptionEnabled(jid: string, enabled: boolean): void;
	sendMessage(
		jid: string,
		body: string,
	): Promise<{ message: ChatMessage | null; error?: string }>;
	sendUnencrypted(jid: string, body: string): Promise<ChatMessage | null>;
	listDevices(jid: string): Promise<OmemoDeviceInfo[]>;
	trustDevice(
		jid: string,
		deviceId: number,
		expectedFingerprint?: string,
	): Promise<void>;
}

const OmemoContext = createContext<OmemoContextValue | null>(null);

export function OmemoProvider({ children }: { children: ReactNode }) {
	const store = useXmppStore();
	const state = useXmppState();
	const { security } = useSettings();
	const accountJid = state.account?.bareJid ?? null;
	const session = useOmemoSession({
		store,
		accountJid,
		connectionStatus: state.connection.status,
		rememberUnlock: security.rememberOmemoUnlock,
	});
	const { accountRef, status, resetIdle } = session;
	const { preferences: encryptedJids, setPreference: setEncryptionEnabled } =
		useEncryptionPreferences(accountJid);

	const handleIncoming = useCallback(
		async (event: OmemoMessageEvent) => {
			const account = accountRef.current;
			const message = createIncomingEncryptedMessage(
				event,
				account?.accountJid ?? "",
			);
			if (!account || account.status !== "ready") {
				store.addMessage({
					...message,
					decryptionError: "Unlock OMEMO to read this message.",
				});
				return;
			}
			const outgoing = event.direction === "outgoing";
			try {
				const decrypted = await account.decrypt(event.from, event.envelope);
				if (!decrypted.trusted && !outgoing) {
					store.addMessage({
						...message,
						trusted: false,
						decryptionError:
							"Encrypted from an unverified device. Verify it in contact info before reading.",
					});
					return;
				}
				store.addMessage({
					...message,
					body: decrypted.plaintext,
					trusted: true,
					decryptionError: undefined,
					omemoEnvelope: undefined,
				});
			} catch (cause) {
				store.addMessage({
					...message,
					decryptionError: omemoErrorMessage(
						cause,
						"This encrypted message could not be decrypted.",
					),
				});
			}
		},
		[accountRef, store],
	);

	useEffect(() => {
		return store.subscribeOmemo((event) => {
			void handleIncoming(event);
		});
	}, [handleIncoming, store]);

	const retryMessages = useOmemoRetryMessages({
		accountJid,
		accountRef,
		status,
		store,
	});

	const isEncryptionIntended = useCallback(
		(jid: string) => {
			const key = bareJid(jid);
			if (Object.hasOwn(encryptedJids, key)) {
				return encryptedJids[key] === "on";
			}
			return (
				security.defaultEncryption === "omemo" &&
				state.conversations[key]?.kind !== "group"
			);
		},
		[encryptedJids, security.defaultEncryption, state.conversations],
	);

	/** Encryption is only truly on when OMEMO is ready to encrypt. */
	const isEncryptionEnabled = useCallback(
		(jid: string) => status === "ready" && isEncryptionIntended(jid),
		[isEncryptionIntended, status],
	);

	const sendMessage = useCallback(
		async (jid: string, body: string) => {
			const account = accountRef.current;
			const accountStatus = account?.status;
			if (!account || accountStatus !== "ready") {
				toast.error(
					accountStatus === "locked"
						? "Unlock OMEMO in Security settings to send encrypted messages."
						: "Set up OMEMO in Security settings to send encrypted messages.",
					{ id: "omemo-send" },
				);
				return { message: null };
			}
			if (!isEncryptionEnabled(jid)) {
				toast.error("Encryption is not enabled for this conversation.", {
					id: "omemo-send",
				});
				return { message: null };
			}
			try {
				const envelope = await account.encryptFor(jid, body);
				const message = await store.sendEncryptedMessage(jid, body, envelope);
				if (!message || message.status === "failed") {
					toast.error("The encrypted message could not be sent.", {
						id: "omemo-send",
					});
					return { message: null, error: "send-failed" };
				}
				resetIdle();
				return { message };
			} catch (cause) {
				const code =
					typeof cause === "object" &&
					cause !== null &&
					"code" in cause &&
					typeof cause.code === "string"
						? cause.code
						: undefined;
				if (code === "no-recipients") {
					return { message: null, error: code };
				}
				toast.error(
					omemoErrorMessage(cause, "The encrypted message could not be sent."),
					{ id: "omemo-send" },
				);
				return { message: null, error: code };
			}
		},
		[accountRef, isEncryptionEnabled, resetIdle, store],
	);

	const sendUnencrypted = useCallback(
		async (jid: string, body: string) => {
			const message = await store.sendMessage(jid, body, undefined, {
				unencryptedFallback: true,
			});
			if (!message) {
				toast.error("The unencrypted message could not be sent.", {
					id: "omemo-send",
				});
			}
			return message;
		},
		[store],
	);

	const listDevices = useCallback(
		async (jid: string) => {
			const account = accountRef.current;
			if (!account || account.status !== "ready") {
				throw new OmemoStorageError("locked");
			}
			return account.listDevices(jid);
		},
		[accountRef],
	);

	const trustDevice = useCallback(
		async (
			jid: string,
			targetDeviceId: number,
			expectedFingerprint?: string,
		) => {
			const account = accountRef.current;
			if (!account || account.status !== "ready") {
				throw new OmemoStorageError("locked");
			}
			await account.trustDevice(jid, targetDeviceId, expectedFingerprint);
			await retryMessages();
			resetIdle();
		},
		[accountRef, resetIdle, retryMessages],
	);

	const value = useMemo<OmemoContextValue>(
		() => ({
			status,
			deviceId: session.deviceId,
			fingerprint: session.fingerprint,
			error: session.error,
			setup: session.setup,
			unlock: session.unlock,
			repair: session.repair,
			reset: session.reset,
			lock: session.lock,
			isEncryptionEnabled,
			isEncryptionIntended,
			setEncryptionEnabled,
			sendMessage,
			sendUnencrypted,
			listDevices,
			trustDevice,
		}),
		[
			status,
			session.deviceId,
			session.fingerprint,
			session.error,
			session.setup,
			session.unlock,
			session.repair,
			session.reset,
			session.lock,
			isEncryptionEnabled,
			isEncryptionIntended,
			setEncryptionEnabled,
			sendMessage,
			sendUnencrypted,
			listDevices,
			trustDevice,
		],
	);

	return (
		<OmemoContext.Provider value={value}>{children}</OmemoContext.Provider>
	);
}

export function useOmemo(): OmemoContextValue {
	const context = useContext(OmemoContext);
	if (!context) {
		throw new Error("useOmemo must be used inside OmemoProvider");
	}
	return context;
}
