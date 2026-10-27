import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string, serverValue = false): boolean {
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			const media = window.matchMedia(query);
			media.addEventListener("change", onStoreChange);
			return () => media.removeEventListener("change", onStoreChange);
		},
		[query],
	);

	const getSnapshot = useCallback(
		() => window.matchMedia(query).matches,
		[query],
	);

	const getServerSnapshot = useCallback(() => serverValue, [serverValue]);

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
