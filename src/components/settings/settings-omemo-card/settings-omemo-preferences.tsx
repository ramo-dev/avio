import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { SettingRow } from "#/components/settings/setting-row/setting-row";
import { Switch } from "#/components/ui/switch";
import { useSettings } from "#/hooks/use-settings";
import {
	setDefaultEncryption,
	setRememberOmemoUnlock,
} from "#/lib/settings/preferences";
import { useOmemo } from "#/providers/omemo-provider";

/**
 * Guided default-encryption switch. Turning it on before OMEMO is ready moves
 * the user to setup/unlock and only saves the default once OMEMO can encrypt.
 */
export function SettingsOmemoPreferences() {
	const { security } = useSettings();
	const omemo = useOmemo();
	const pendingDefault = useRef(false);
	const enabled = security.defaultEncryption === "omemo";
	const ready = omemo.status === "ready";
	const connectable = omemo.status !== "disabled";

	useEffect(() => {
		if (!pendingDefault.current || omemo.status !== "ready") return;
		pendingDefault.current = false;
		setDefaultEncryption("omemo");
		toast.success("New direct chats will start encrypted.", {
			id: "omemo-default",
		});
	}, [omemo.status]);

	function toggleDefault(next: boolean) {
		if (!connectable) return;
		if (!next) {
			pendingDefault.current = false;
			setDefaultEncryption("none");
			return;
		}
		if (ready) {
			setDefaultEncryption("omemo");
			return;
		}
		pendingDefault.current = true;
		toast("Set up or unlock OMEMO to turn this on.", {
			id: "omemo-default",
		});
		window.requestAnimationFrame(() => {
			document
				.getElementById("settings-omemo")
				?.scrollIntoView({ behavior: "smooth", block: "center" });
			document
				.querySelector<HTMLInputElement>(
					"#omemo-setup-passphrase, #omemo-unlock-passphrase",
				)
				?.focus();
		});
	}

	const description = !connectable
		? "Connect to XMPP first."
		: !enabled
			? "Off. Turning this on will ask you to set up OMEMO."
			: ready
				? "On. New one-to-one chats start encrypted."
				: omemo.status === "locked"
					? "On. Unlock OMEMO to send encrypted messages."
					: "On. Finish setting up OMEMO to send encrypted messages.";

	return (
		<div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
			<SettingRow
				title="Encrypt new direct chats by default"
				description={description}
				control={
					<Switch
						aria-label="Encrypt new direct chats by default"
						checked={enabled}
						disabled={!connectable}
						onCheckedChange={toggleDefault}
					/>
				}
			/>
			<SettingRow
				title="Remember unlock on this device"
				description="Refresh can unlock without the passphrase. The key is non-exportable, cleared by Lock or logout, and expires after 24 hours."
				control={
					<Switch
						aria-label="Remember OMEMO unlock on this device"
						checked={security.rememberOmemoUnlock}
						onCheckedChange={setRememberOmemoUnlock}
					/>
				}
			/>
		</div>
	);
}
