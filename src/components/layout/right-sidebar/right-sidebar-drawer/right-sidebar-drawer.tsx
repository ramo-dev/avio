import { RiCloseLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "#/components/ui/drawer";
import { ScrollArea } from "#/components/ui/scroll-area";
import {
	type RightSidebarPanel,
	useRightSidebar,
} from "#/providers/right-sidebar-provider";

const EXIT_MS = 500;

export function RightSidebarDrawer() {
	const { panel, close } = useRightSidebar();
	const [rendered, setRendered] = useState<RightSidebarPanel | null>(panel);

	useEffect(() => {
		if (panel) {
			setRendered(panel);
			return;
		}

		const timer = setTimeout(() => setRendered(null), EXIT_MS);
		return () => clearTimeout(timer);
	}, [panel]);

	return (
		<Drawer
			open={panel !== null}
			onOpenChange={(open) => {
				if (!open) close();
			}}
			swipeDirection="down"
			showSwipeHandle
		>
			{rendered && (
				<DrawerContent className="[--drawer-height:70dvh]">
					<DrawerHeader>
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 text-start">
								<DrawerTitle>{rendered.title}</DrawerTitle>
								{rendered.description && (
									<DrawerDescription>{rendered.description}</DrawerDescription>
								)}
							</div>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={close}
								aria-label="Close sidebar"
							>
								<RiCloseLine />
							</Button>
						</div>
					</DrawerHeader>
					<ScrollArea className="min-h-0 flex-1">
						<div className="p-4">{rendered.content}</div>
					</ScrollArea>
				</DrawerContent>
			)}
		</Drawer>
	);
}
