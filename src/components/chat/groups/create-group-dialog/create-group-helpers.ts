export interface Contact {
	jid: string;
	name: string;
}

export interface CreateGroupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function initials(name: string): string {
	const letters = name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
	return letters || "?";
}
