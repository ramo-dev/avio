import { RiMenuLine } from "@remixicon/react";
import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "#/components/ui/sheet";

export function AppShell({
	sidebar,
	children,
}: {
	sidebar: ReactNode;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	useEffect(() => {
		if (pathname) setOpen(false);
	}, [pathname]);

	return (
		<div className="flex h-svh overflow-hidden bg-background">
			<aside className="hidden w-80 shrink-0 border-r border-border md:block">
				{sidebar}
			</aside>
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									aria-label="Open navigation"
								/>
							}
						>
							<RiMenuLine />
						</SheetTrigger>
						<SheetContent side="left" className="w-80 p-0">
							<SheetHeader className="sr-only">
								<SheetTitle>Navigation</SheetTitle>
								<SheetDescription>Contacts and account</SheetDescription>
							</SheetHeader>
							<div className="h-full min-h-0">{open ? sidebar : null}</div>
						</SheetContent>
					</Sheet>
					<span className="text-sm font-semibold">Avio</span>
				</div>
				<main className="min-h-0 flex-1 overflow-hidden">{children}</main>
			</div>
		</div>
	);
}
