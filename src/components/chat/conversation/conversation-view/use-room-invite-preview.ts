import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import type { RoomInviteRequest } from "#/types/chat";
import type { XmppStore } from "#/types/store";

type PreviewStatus = "idle" | "loading" | "ok" | "restricted" | "unavailable";

/** Loads read-only room history and handles accept/decline for an invite. */
export function useRoomInvitePreview({
	jid,
	invite,
	isPreview,
	actions,
	navigate,
}: {
	jid: string;
	invite: RoomInviteRequest | undefined;
	isPreview: boolean;
	actions: XmppStore;
	navigate: (opts: { to: "/chat" }) => void;
}) {
	const [status, setStatus] = useState<PreviewStatus>("idle");
	const loaded = useRef<string | null>(null);

	useEffect(() => {
		if (!isPreview || !invite) {
			loaded.current = null;
			setStatus("idle");
			return;
		}
		if (loaded.current === jid) return;
		loaded.current = jid;
		setStatus("loading");
		void actions
			.loadRoomPreview(jid)
			.then((result) => setStatus(result.status))
			.catch(() => setStatus("unavailable"));
	}, [actions, invite, isPreview, jid]);

	async function accept() {
		if (!invite) return;
		try {
			await actions.acceptRoomInvite(jid);
			toast.success(`Joined ${invite.roomName}`);
		} catch {
			// The store surfaces the failure through the shared error toaster.
		}
	}

	async function decline() {
		await actions.declineRoomInvite(jid);
		navigate({ to: "/chat" });
	}

	return { status, accept, decline };
}
