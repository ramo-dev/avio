import {
	RiAlertLine,
	RiLoader4Line,
	RiLockLine,
	RiLockUnlockLine,
	RiShieldCheckLine,
} from "@remixicon/react";
import { type FormEvent, useState } from "react";
import { toast } from "react-hot-toast";
import { ContactInfoOmemo } from "#/components/chat/conversation/header/contact-info-panel/contact-info-omemo";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { useSettings } from "#/hooks/use-settings";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";
import { useOmemo } from "#/providers/omemo-provider";
import type { OmemoAccountStatus } from "#/types/omemo";

const MIN_PASSPHRASE_LENGTH = 8;

const STATUS_LABELS: Record<OmemoAccountStatus, string> = {
	disabled: "Not connected",
	setup: "Not set up",
	locked: "Locked",
	unlocking: "Unlocking",
	ready: "Ready",
	error: "Unavailable",
};

const STATUS_TONES: Record<
	OmemoAccountStatus,
	"default" | "secondary" | "outline" | "destructive"
> = {
	disabled: "outline",
	setup: "outline",
	locked: "secondary",
	unlocking: "secondary",
	ready: "default",
	error: "destructive",
};

export function SettingsOmemoCard() {
	const omemo = useOmemo();
	const state = useXmppState();
	const { security } = useSettings();
	const ownJid = state.account?.bareJid;
	const [passphrase, setPassphrase] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [busy, setBusy] = useState(false);

	const setupMode = omemo.status === "setup";
	const unlockMode = omemo.status === "locked";
	const ready = omemo.status === "ready";
	const working = busy || omemo.status === "unlocking";

	async function submitSetup(event: FormEvent) {
		event.preventDefault();
		if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
			toast.error("Use a passphrase of at least 8 characters.", {
				id: "omemo-passphrase",
			});
			return;
		}
		if (passphrase !== confirmation) {
			toast.error("The passphrases do not match.", { id: "omemo-passphrase" });
			return;
		}
		setBusy(true);
		try {
			await omemo.setup(passphrase);
		} finally {
			setPassphrase("");
			setConfirmation("");
			setBusy(false);
		}
	}
	async function submitUnlock(event: FormEvent) {
		event.preventDefault();
		if (passphrase.length === 0) {
			toast.error("Enter your OMEMO passphrase.", { id: "omemo-passphrase" });
			return;
		}
		setBusy(true);
		try {
			await omemo.unlock(passphrase);
		} finally {
			setPassphrase("");
			setBusy(false);
		}
	}

	return (
		<div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
			<div className="flex items-start gap-3">
				<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
					{ready ? (
						<RiShieldCheckLine className="size-4" />
					) : (
						<RiLockLine className="size-4" />
					)}
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-sm font-medium">OMEMO end-to-end encryption</p>
						<Badge variant={STATUS_TONES[omemo.status]}>
							{STATUS_LABELS[omemo.status]}
						</Badge>
					</div>
					<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
						Experimental and unaudited. Direct messages only. Encryption is off
						by default and never falls back to plaintext.
					</p>
				</div>
			</div>

			<div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
				<RiAlertLine className="mt-0.5 size-4 shrink-0" />
				<p>
					{security.rememberOmemoUnlock
						? "Your passphrase is never stored. This browser keeps a non-exportable key that unlocks OMEMO until you lock, log out, or the session auto-locks. The passphrase cannot be recovered if lost."
						: "Your passphrase is never stored and cannot be recovered. Losing it locks this device's OMEMO keys."}{" "}
					Sessions lock after 10 minutes of inactivity.
				</p>
			</div>

			{omemo.status === "disabled" && (
				<p className="text-xs text-muted-foreground">
					Connect to XMPP to set up or unlock OMEMO.
				</p>
			)}

			{omemo.status === "error" && (
				<p className="text-xs text-muted-foreground">
					{omemo.error ?? "OMEMO is unavailable."} Reconnect and try again.
				</p>
			)}

			{setupMode && (
				<form className="flex flex-col gap-3" onSubmit={submitSetup}>
					<div className="space-y-1.5">
						<Label htmlFor="omemo-setup-passphrase">Passphrase</Label>
						<Input
							id="omemo-setup-passphrase"
							type="password"
							autoComplete="new-password"
							value={passphrase}
							onChange={(event) => setPassphrase(event.target.value)}
							placeholder="At least 8 characters"
							disabled={working}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="omemo-setup-confirmation">Confirm passphrase</Label>
						<Input
							id="omemo-setup-confirmation"
							type="password"
							autoComplete="new-password"
							value={confirmation}
							onChange={(event) => setConfirmation(event.target.value)}
							placeholder="Repeat the passphrase"
							disabled={working}
						/>
					</div>
					<Button type="submit" size="sm" disabled={working}>
						{working ? <RiLoader4Line className="animate-spin" /> : null}
						Set up OMEMO
					</Button>
				</form>
			)}

			{unlockMode && (
				<form className="flex flex-col gap-3" onSubmit={submitUnlock}>
					<div className="space-y-1.5">
						<Label htmlFor="omemo-unlock-passphrase">Passphrase</Label>
						<Input
							id="omemo-unlock-passphrase"
							type="password"
							autoComplete="current-password"
							value={passphrase}
							onChange={(event) => setPassphrase(event.target.value)}
							placeholder="Unlock this device"
							disabled={working}
						/>
					</div>
					<Button type="submit" size="sm" disabled={working}>
						{working ? (
							<RiLoader4Line className="animate-spin" />
						) : (
							<RiLockUnlockLine />
						)}
						Unlock OMEMO
					</Button>
				</form>
			)}

			{ready && (
				<div className="flex flex-col gap-3">
					<div className="grid gap-2 text-xs">
						<div className="flex items-center justify-between gap-3">
							<span className="text-muted-foreground">Device ID</span>
							<span className="font-mono">{omemo.deviceId ?? "Unknown"}</span>
						</div>
						<div className="space-y-1">
							<span className="text-muted-foreground">Fingerprint</span>
							<p className="font-mono break-all text-foreground">
								{omemo.fingerprint ?? "Unavailable"}
							</p>
						</div>
					</div>
					<p className="text-xs leading-relaxed text-muted-foreground">
						Encryption stays off per conversation. Turn it on from the lock
						button in the composer, then trust the contact's device in their
						contact info before sending.
					</p>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={omemo.lock}
						className="self-start"
					>
						<RiLockLine />
						Lock OMEMO
					</Button>
					{ownJid && (
						<ContactInfoOmemo
							jid={ownJid}
							localDeviceId={omemo.deviceId}
							title="Your devices"
						/>
					)}
				</div>
			)}
		</div>
	);
}
