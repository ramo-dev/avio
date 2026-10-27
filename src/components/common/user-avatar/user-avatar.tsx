import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { avatarInitials } from "#/lib/format/avatar";
import { cn } from "#/lib/utils";

interface UserAvatarProps {
	jid: string;
	name?: string;
	className?: string;
	size?: "default" | "sm" | "lg";
}

export function UserAvatar({ jid, name, className, size }: UserAvatarProps) {
	return (
		<Avatar size={size} className={cn("border border-border", className)}>
			<AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
				{avatarInitials(name, jid)}
			</AvatarFallback>
		</Avatar>
	);
}
