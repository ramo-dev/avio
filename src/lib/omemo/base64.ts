const CHUNK_SIZE = 0x8000;

/**
 * Base64 helpers that work in browsers and Node without extra dependencies.
 *
 * `btoa`/`atob` operate on binary strings, so bytes are chunked to avoid
 * exceeding the argument limit of `String.fromCharCode`.
 */
export function encodeBase64(bytes: Uint8Array<ArrayBuffer>): string {
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
		const chunk = bytes.subarray(offset, offset + CHUNK_SIZE);
		binary += String.fromCharCode(...chunk);
	}
	return btoa(binary);
}

/**
 * Decodes base64, returning `null` instead of throwing for malformed input.
 * Callers map the failure to the typed error appropriate for the field.
 */
export function decodeBase64(value: string): Uint8Array<ArrayBuffer> | null {
	try {
		const binary = atob(value);
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index += 1) {
			bytes[index] = binary.charCodeAt(index);
		}
		return bytes;
	} catch {
		return null;
	}
}
