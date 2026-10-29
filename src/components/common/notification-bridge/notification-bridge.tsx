import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSettings } from "#/hooks/use-settings";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";
import { loadChatPreferences } from "#/lib/chat/preferences";
import { addNotification } from "#/lib/notifications/store";
import { displayJidName } from "#/lib/xmpp/jid";

export function NotificationBridge() {
	const state = useXmppState();
	const { notifications } = useSettings();
	const navigate = useNavigate();
	const seen = useRef<Set<string>>(new Set());
	const seenInvites = useRef<Set<string>>(new Set());
	const seeded = useRef(false);
	const [mountedAt] = useState(() => Date.now());

	useEffect(() => {
		const firstPass = !seeded.current;
		const accountJid = state.account?.bareJid ?? null;
		const preferences = accountJid ? loadChatPreferences(accountJid) : {};
		const canNotify =
			notifications.enabled &&
			typeof Notification !== "undefined" &&
			Notification.permission === "granted";
		const visible =
			document.visibilityState === "visible" && document.hasFocus();

		function openConversation(jid: string, kind: "direct" | "group") {
			window.focus();
			if (kind === "group") {
				void navigate({ to: "/chat/group/$room", params: { room: jid } });
			} else {
				void navigate({ to: "/chat/$jid", params: { jid } });
			}
		}

		function showSystemNotification(
			title: string,
			body: string,
			tag: string,
			onClick: () => void,
		) {
			if (!canNotify) return;
			try {
				const notification = new Notification(title, { body, tag });
				notification.onclick = () => {
					onClick();
					notification.close();
				};
			} catch {
				// Some platforms reject notifications even after permission.
			}
		}

		for (const [jid, conversation] of Object.entries(state.conversations)) {
			for (const message of conversation.messages) {
				if (seen.current.has(message.id)) continue;
				seen.current.add(message.id);

				if (firstPass) continue;
				if (message.direction !== "incoming") continue;
				if (message.timestamp < mountedAt - 5_000) continue;

				const preference = preferences[jid];
				if (preference?.muted || preference?.archived) continue;

				const name =
					conversation.kind === "group"
						? (conversation.title ?? jid)
						: displayJidName(jid, state.contacts[jid]?.name);
				const preview =
					message.body.trim() ||
					message.attachments?.[0]?.name ||
					"New message";

				if (!(visible && state.activeJid === jid)) {
					addNotification(accountJid, {
						id: `${jid}:${message.id}`,
						jid,
						kind: conversation.kind,
						name,
						body: preview,
						timestamp: message.timestamp,
						read: false,
					});
				}

				if (visible) continue;
				showSystemNotification(
					name,
					notifications.previews ? preview : "New message",
					jid,
					() => openConversation(jid, conversation.kind),
				);
			}
		}

		for (const request of state.roomInviteRequests) {
			const requestKey = `${request.roomJid}:${request.receivedAt}`;
			if (seenInvites.current.has(requestKey)) continue;
			seenInvites.current.add(requestKey);

			const title = `Invited to ${request.roomName}`;
			addNotification(accountJid, {
				id: `invite:${requestKey}`,
				jid: request.roomJid,
				kind: "group",
				name: title,
				body: request.reason || "You were invited to this group chat.",
				timestamp: request.receivedAt,
				read: false,
				invite: true,
			});
			if (!visible) {
				showSystemNotification(
					title,
					request.reason || "You were invited to this group chat.",
					request.roomJid,
					() => {
						window.focus();
						void navigate({ to: "/chat" });
					},
				);
			}
		}

		seeded.current = true;
	}, [mountedAt, navigate, notifications, state]);

	return null;
}
