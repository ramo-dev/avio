import type { OmemoMessageContext } from "#/types/omemo";

export interface DecryptedPayload {
	body: string;
	replyTo?: { id: string; to?: string };
	editId?: string;
}

export function encodePayload(
	body: string,
	context: OmemoMessageContext | undefined,
): string {
	if (!context?.replyTo && !context?.editId) return body;
	return JSON.stringify({
		avio: 1,
		body,
		replyTo: context.replyTo,
		editId: context.editId,
	});
}

/** Legacy payloads are plain text; metadata is only parsed from marked JSON. */
export function decodePayload(value: string): DecryptedPayload {
	if (!value.startsWith("{")) return { body: value };
	try {
		const parsed: unknown = JSON.parse(value);
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed) ||
			(parsed as { avio?: unknown }).avio !== 1 ||
			typeof (parsed as { body?: unknown }).body !== "string"
		) {
			return { body: value };
		}
		const record = parsed as {
			body: string;
			replyTo?: { id?: unknown; to?: unknown };
			editId?: unknown;
		};
		const replyTo =
			record.replyTo && typeof record.replyTo.id === "string"
				? {
						id: record.replyTo.id,
						to:
							typeof record.replyTo.to === "string"
								? record.replyTo.to
								: undefined,
					}
				: undefined;
		return {
			body: record.body,
			replyTo,
			editId: typeof record.editId === "string" ? record.editId : undefined,
		};
	} catch {
		return { body: value };
	}
}
