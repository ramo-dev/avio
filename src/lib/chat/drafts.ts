const DRAFT_PREFIX = "avio.draft.v1";

export function draftKey(account: string, jid: string): string {
	return `${DRAFT_PREFIX}:${account}:${jid}`;
}

export function readDraft(key: string): string {
	if (typeof localStorage === "undefined") return "";
	try {
		return localStorage.getItem(key) ?? "";
	} catch {
		return "";
	}
}

export function writeDraft(key: string, value: string): void {
	if (typeof localStorage === "undefined") return;
	try {
		if (value.trim()) localStorage.setItem(key, value);
		else localStorage.removeItem(key);
	} catch {
		// Drafts are optional; storage failures must not block composing.
	}
}

export function clearDraft(key: string): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.removeItem(key);
	} catch {
		// Drafts are optional; storage failures must not block composing.
	}
}
