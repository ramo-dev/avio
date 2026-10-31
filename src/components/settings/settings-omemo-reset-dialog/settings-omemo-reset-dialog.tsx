import { RiAlertLine } from "@remixicon/react";
import { type FormEvent, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogOverlay,
	DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	MIN_PASSPHRASE_LENGTH,
	passphraseIssue,
	passphraseIssueMessage,
} from "#/lib/omemo/passphrase";
import { useOmemo } from "#/providers/omemo-provider";

/** Destructive OMEMO identity reset, guarded by a fresh passphrase. */
export function SettingsOmemoResetDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const omemo = useOmemo();
	const [passphrase, setPassphrase] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [busy, setBusy] = useState(false);

	function changeOpen(next: boolean) {
		if (busy) return;
		if (!next) {
			setPassphrase("");
			setConfirmation("");
		}
		onOpenChange(next);
	}

	async function submit(event: FormEvent) {
		event.preventDefault();
		const issue = passphraseIssue(passphrase);
		if (issue) {
			toast.error(passphraseIssueMessage(issue), { id: "omemo-reset" });
			return;
		}
		if (passphrase !== confirmation) {
			toast.error("The passphrases do not match.", { id: "omemo-reset" });
			return;
		}
		setBusy(true);
		try {
			const ok = await omemo.reset(passphrase);
			if (!ok) return;
			toast.success("OMEMO reinitialized with a new identity.", {
				id: "omemo-reset",
			});
			setPassphrase("");
			setConfirmation("");
			onOpenChange(false);
		} finally {
			setBusy(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={changeOpen}>
			<DialogContent nestedOverlay className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Reset OMEMO?</DialogTitle>
					<DialogDescription>
						This replaces your encryption identity and cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed text-muted-foreground">
					<RiAlertLine className="mt-0.5 size-4 shrink-0 text-destructive" />
					<ul className="list-disc space-y-1 pl-4">
						<li>Your device ID and fingerprint change.</li>
						<li>Contacts must verify your new device before trusting it.</li>
						<li>Old encrypted history on this device cannot be read.</li>
						<li>Remembered unlock is cleared.</li>
					</ul>
				</div>

				<form className="flex flex-col gap-3" onSubmit={submit}>
					<Field>
						<FieldLabel htmlFor="omemo-reset-passphrase">
							New passphrase
						</FieldLabel>
						<Input
							id="omemo-reset-passphrase"
							type="password"
							autoComplete="new-password"
							value={passphrase}
							onChange={(event) => setPassphrase(event.target.value)}
							placeholder={`At least ${MIN_PASSPHRASE_LENGTH} characters`}
							disabled={busy}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="omemo-reset-confirmation">
							Confirm new passphrase
						</FieldLabel>
						<Input
							id="omemo-reset-confirmation"
							type="password"
							autoComplete="new-password"
							value={confirmation}
							onChange={(event) => setConfirmation(event.target.value)}
							placeholder="Repeat the passphrase"
							disabled={busy}
						/>
					</Field>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => changeOpen(false)}
							disabled={busy}
						>
							Cancel
						</Button>
						<Button type="submit" variant="destructive" disabled={busy}>
							Reset OMEMO
						</Button>
					</div>
				</form>

				<DialogOverlay />
			</DialogContent>
		</Dialog>
	);
}
