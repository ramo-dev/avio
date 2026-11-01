import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { TrustReminderToast } from "#/components/chat/conversation/trust-reminder/trust-reminder-toast";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";
import {
	shouldRemindTrust,
	trustReminderSignature,
	untrustedDeviceIds,
} from "#/lib/omemo/trust-reminder";
import { bareJid } from "#/lib/xmpp/jid";
import { useOmemo } from "#/providers/omemo-provider";
import { useRightSidebar } from "#/providers/right-sidebar-provider";

const STORAGE_PREFIX = "avio:omemo-trust-reminder";
const TOAST_DURATION_MS = 15_000;

function readRemembered(key: string): string | null {
	try {
		return window.sessionStorage.getItem(key);
	} catch {
		return null;
	}
}

function remember(key: string, signature: string): void {
	try {
		window.sessionStorage.setItem(key, signature);
	} catch {
		// Private modes can reject storage; the reminder still shows once.
	}
}

/**
 * Nudges the user to review device trust when a conversation involves untrusted
 * peer devices, either because encryption is on or because unverified encrypted
 * messages arrived. The toast opens the contact panel, which is where
 * fingerprints are compared and trusted. One reminder per device set per
 * session, so dismissing it is respected and a new device shows it again.
 */
export function useOmemoTrustReminder({
	jid,
	name,
	isGroup,
	hasUnverifiedMessages,
}: {
	jid: string;
	name: string;
	isGroup: boolean;
	hasUnverifiedMessages: boolean;
}) {
	const { status, listDevices, isEncryptionEnabled } = useOmemo();
	const { open } = useRightSidebar();
	const state = useXmppState();
	const accountJid = state.account?.bareJid ?? null;
	const shouldRemind =
		!isGroup && (isEncryptionEnabled(jid) || hasUnverifiedMessages);
	const toastId = `omemo-trust-reminder:${jid}`;

	useEffect(() => {
		return () => {
			toast.dismiss(toastId);
		};
	}, [toastId]);

	useEffect(() => {
		if (!accountJid || !shouldRemind || status !== "ready") return;
		let cancelled = false;

		void listDevices(jid)
			.then((devices) => {
				if (cancelled) return;
				const signature = trustReminderSignature(devices);
				const key = `${STORAGE_PREFIX}:${bareJid(accountJid)}:${bareJid(jid)}`;
				if (!shouldRemindTrust(signature, readRemembered(key))) return;
				remember(key, signature);
				const count = untrustedDeviceIds(devices).length;
				toast.custom(
					(t) => (
						<TrustReminderToast
							name={name}
							count={count}
							onReview={() => {
								toast.dismiss(t.id);
								open({ kind: "contact", jid });
							}}
							onDismiss={() => toast.dismiss(t.id)}
						/>
					),
					{ id: toastId, duration: TOAST_DURATION_MS },
				);
			})
			.catch(() => undefined);

		return () => {
			cancelled = true;
		};
	}, [accountJid, jid, listDevices, name, open, shouldRemind, status, toastId]);
}
