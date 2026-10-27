import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 200): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [delay, value]);

	return debounced;
}
