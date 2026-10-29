import type { ReactNode } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "#/components/ui/drawer";
import { useMediaQuery } from "#/hooks/use-media-query";
import { cn } from "#/lib/utils";

export function ResponsiveDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
	className,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	children?: ReactNode;
	footer?: ReactNode;
	className?: string;
}) {
	const desktop = useMediaQuery("(min-width: 768px)");

	if (desktop) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className={cn("flex flex-col gap-4", className)}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}
					</DialogHeader>
					{children}
					{footer && <DialogFooter>{footer}</DialogFooter>}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer
			open={open}
			onOpenChange={onOpenChange}
			swipeDirection="down"
			showSwipeHandle
		>
			<DrawerContent className="[--drawer-height:auto]">
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					{description && <DrawerDescription>{description}</DrawerDescription>}
				</DrawerHeader>
				{children && <div className="px-4">{children}</div>}
				{footer && <DrawerFooter>{footer}</DrawerFooter>}
			</DrawerContent>
		</Drawer>
	);
}
