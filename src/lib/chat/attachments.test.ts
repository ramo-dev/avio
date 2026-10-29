import { describe, expect, it } from "vitest";
import {
	fileNameFromUrl,
	formatBytes,
	getKind,
	kindFromName,
} from "#/lib/chat/attachments";

function file(name: string, type: string) {
	return new File(["x"], name, { type });
}

describe("attachment helpers", () => {
	it("classifies files by MIME type", () => {
		expect(getKind(file("photo.png", "image/png"))).toBe("image");
		expect(getKind(file("clip.mp4", "video/mp4"))).toBe("video");
		expect(getKind(file("voice.ogg", "audio/ogg"))).toBe("audio");
		expect(getKind(file("notes.txt", "text/plain"))).toBe("file");
	});

	it("classifies attachments by MIME type or extension", () => {
		expect(kindFromName("voice.ogg")).toBe("audio");
		expect(kindFromName("voice.weba")).toBe("audio");
		expect(kindFromName("voice.bin", "audio/webm")).toBe("audio");
		expect(kindFromName("clip.webm")).toBe("video");
		expect(kindFromName("clip.webm", "audio/webm")).toBe("audio");
		expect(kindFromName("notes.txt")).toBe("file");
	});

	it("derives names from URLs", () => {
		expect(
			fileNameFromUrl("https://files.example.com/a/voice%20note.ogg"),
		).toBe("voice note.ogg");
		expect(fileNameFromUrl("not a url")).toBe("Attachment");
	});

	it("formats byte sizes", () => {
		expect(formatBytes(undefined)).toBe("");
		expect(formatBytes(512)).toBe("512 B");
		expect(formatBytes(2048)).toBe("2 KB");
		expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
	});
});
