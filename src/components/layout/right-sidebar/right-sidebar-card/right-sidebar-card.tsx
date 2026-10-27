import { RiCloseLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { ScrollArea } from "#/components/ui/scroll-area";
import { cn } from "#/lib/utils";
import {
	type RightSidebarPanel,
	useRightSidebar,
} from "#/providers/right-sidebar-provider";

const EXIT_MS = 300;

export function RightSidebarCard() {
	const { panel, close } = useRightSidebar();
	const [rendered, setRendered] = useState<RightSidebarPanel | null>(panel);
	const [visible, setVisible] = useState(panel !== null);

	useEffect(() => {
		if (panel) {
			setRendered(panel);
			setVisible(true);
			return;
		}

		setVisible(false);
		const timer = setTimeout(() => setRendered(null), EXIT_MS);
		return () => clearTimeout(timer);
	}, [panel]);

	return (
		<div
			className={cn(
				"h-full shrink-0 overflow-hidden transition-[width,margin,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width,opacity]",
				visible
					? "ml-2 w-[20rem] opacity-100"
					: "pointer-events-none ml-0 w-0 opacity-0",
			)}
			aria-hidden={!visible}
		>
			{rendered && (
				<aside className="flex h-full w-[20rem] flex-col overflow-hidden rounded-lg border border-border bg-card ">
					<header className="flex h-16 shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-2.5">
						<div className="min-w-0 text-start">
							<h2 className="truncate text-start text-sm font-semibold">
								{rendered.title}
							</h2>
							{rendered.description && (
								<p className="truncate text-xs text-muted-foreground">
									{rendered.description}
								</p>
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
					</header>
					<ScrollArea className="min-h-0 flex-1">
						<div className="p-4">{rendered.content}</div>
					</ScrollArea>
				</aside>
			)}
		</div>
	);
}
