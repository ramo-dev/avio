/** Short, non-cryptographic hash for deriving stable local IDs. */
export function stableHash(value: string): string {
	let result = 5381;
	for (let index = 0; index < value.length; index += 1) {
		result = (result * 33) ^ value.charCodeAt(index);
	}
	return (result >>> 0).toString(36);
}
