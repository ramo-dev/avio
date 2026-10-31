import {
	fileNameFromUrl,
	isSafeAttachmentUrl,
	kindFromName,
} from "#/lib/chat/attachments";
import { stableHash } from "#/lib/xmpp/stable-hash";
import type { MessageAttachment } from "#/types/attachment";

export interface RawLink {
	url?: string;
	description?: string;
}

/**
 * Maps OOB links from a stanza to attachments. Links that are not http(s) are
 * dropped here so the UI never receives an unsafe `href` or `src`.
 */
export function normalizeLinkAttachments(
	links: RawLink[] = [],
): MessageAttachment[] {
	return links
		.filter(
			(link): link is { url: string; description?: string } =>
				typeof link.url === "string" && isSafeAttachmentUrl(link.url),
		)
		.map((link) => {
			const name = link.description?.trim() || fileNameFromUrl(link.url);
			return {
				id: `att-${stableHash(link.url)}`,
				url: link.url,
				name,
				kind: kindFromName(name),
			};
		});
}
