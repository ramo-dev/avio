import { useDefaultLayout } from "react-resizable-panels";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "#/components/ui/resizable";

const GROUP_ID = "avio-chat-split";
const PANEL_IDS = ["chat-list", "conversation"];

export function ChatWorkspace({
	list,
	children,
}: {
	list: React.ReactNode;
	children: React.ReactNode;
}) {
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: GROUP_ID,
		panelIds: PANEL_IDS,
		storage: typeof window === "undefined" ? undefined : window.localStorage,
		onlySaveAfterUserInteractions: true,
	});

	return (
		<ResizablePanelGroup
			id={GROUP_ID}
			orientation="horizontal"
			defaultLayout={defaultLayout}
			onLayoutChanged={onLayoutChanged}
			className="min-h-0 min-w-0 flex-1"
		>
			<ResizablePanel
				id="chat-list"
				defaultSize="29%"
				minSize="380px"
				maxSize="40%"
				className="min-h-0 overflow-hidden"
			>
				{list}
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel
				id="conversation"
				minSize="50%"
				className="min-h-0 overflow-hidden"
			>
				<div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
					{children}
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
