import { RiCloseLine } from "@remixicon/react";
import { SettingsContent } from "#/components/settings/settings-content/settings-content";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "#/components/ui/drawer";
import { ScrollArea } from "#/components/ui/scroll-area";
import { useMediaQuery } from "#/hooks/use-media-query";
import { useSettings } from "#/providers/settings-provider";

export function SettingsHost() {
	const { open, setOpen } = useSettings();
	const desktop = useMediaQuery("(min-width: 768px)");

	if (desktop) {
		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="flex h-full max-h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden sm:max-w-4xl">
					<DialogHeader className="shrink-0">
						<DialogTitle>Settings</DialogTitle>
						<DialogDescription>
							Choose how Avio looks, sounds, and behaves.
						</DialogDescription>
					</DialogHeader>
					<div className="min-h-0 flex-1">
						<SettingsContent />
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer
			open={open}
			onOpenChange={setOpen}
			swipeDirection="down"
			showSwipeHandle
		>
			<DrawerContent className="[--drawer-height:72dvh]">
				<DrawerHeader>
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<DrawerTitle>Settings</DrawerTitle>
							<DrawerDescription>
								Choose how Avio looks, sounds, and behaves.
							</DrawerDescription>
						</div>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => setOpen(false)}
							aria-label="Close settings"
						>
							<RiCloseLine />
						</Button>
					</div>
				</DrawerHeader>
				<ScrollArea className="min-h-0 flex-1">
					<div className="p-4">
						<SettingsContent />
					</div>
				</ScrollArea>
			</DrawerContent>
		</Drawer>
	);
}
