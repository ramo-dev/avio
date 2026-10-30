import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";

/** Confirms an explicit plaintext fallback when no secure device exists. */
export function ComposerFallbackDialog({
	open,
	onClose,
	onSend,
}: {
	open: boolean;
	onClose: () => void;
	onSend: () => void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>No secure devices found</AlertDialogTitle>
					<AlertDialogDescription>
						This contact has not set up OMEMO on a device. Sending now will be
						unencrypted, and the server can read the message.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onSend}>
						Send unencrypted
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
