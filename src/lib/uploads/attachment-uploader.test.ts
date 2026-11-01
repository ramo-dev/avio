// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createAttachmentUploader,
	insecureServiceUrlMessage,
	uploadFailureMessage,
	uploadServiceErrorMessage,
} from "#/lib/uploads/attachment-uploader";
import type { XmppAdapter } from "#/types/store";

function adapter(overrides: Partial<XmppAdapter>): XmppAdapter {
	return overrides as unknown as XmppAdapter;
}

function file(size = 1024): File {
	return { name: "photo.png", size, type: "image/png" } as File;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("uploadServiceErrorMessage", () => {
	it("explains a missing XEP-0363 service", () => {
		const message = uploadServiceErrorMessage(
			new Error("No upload service discovered on: example.com"),
		);
		expect(message).toContain("XEP-0363");
		expect(message).toContain("upload component");
	});

	it("keeps the original error for other failures", () => {
		expect(uploadServiceErrorMessage(new Error("Connection lost."))).toBe(
			"Connection lost.",
		);
	});
});

describe("insecureServiceUrlMessage", () => {
	it("flags http:// URLs in a secure context", () => {
		vi.stubGlobal("window", { location: { protocol: "https:" } });
		expect(
			insecureServiceUrlMessage(
				"http://upload.example.com/file",
				"https://upload.example.com/file",
			),
		).toContain("insecure http:// URL");
	});

	it("allows http:// URLs during local development", () => {
		vi.stubGlobal("window", { location: { protocol: "http:" } });
		expect(
			insecureServiceUrlMessage(
				"http://localhost:5280/file",
				"http://localhost:5280/file",
			),
		).toBeNull();
	});

	it("allows https:// URLs", () => {
		vi.stubGlobal("window", { location: { protocol: "https:" } });
		expect(
			insecureServiceUrlMessage(
				"https://upload.example.com/file",
				"https://upload.example.com/file",
			),
		).toBeNull();
	});
});

describe("uploadFailureMessage", () => {
	it("points at the reverse proxy for a 404", () => {
		expect(uploadFailureMessage(404)).toContain("reverse proxy");
	});

	it("names a size rejection", () => {
		expect(uploadFailureMessage(413)).toContain("too large");
	});
});

describe("createAttachmentUploader", () => {
	it("surfaces the discovered service failure", async () => {
		const uploader = createAttachmentUploader(
			adapter({
				getUploadService: async () => {
					throw new Error("No upload service discovered on: example.com");
				},
			}),
		);

		await expect(uploader.upload(file())).rejects.toThrow("XEP-0363");
	});

	it("refuses files above the server limit", async () => {
		const uploader = createAttachmentUploader(
			adapter({
				getUploadService: async () => ({
					jid: "upload.example.com",
					maxSize: 512,
				}),
			}),
		);

		await expect(uploader.upload(file())).rejects.toThrow("larger than");
	});

	it("refuses an http:// slot in a secure context", async () => {
		vi.stubGlobal("window", { location: { protocol: "https:" } });
		const uploader = createAttachmentUploader(
			adapter({
				getUploadService: async () => ({ jid: "upload.example.com" }),
				getUploadSlot: async () => ({
					upload: { url: "http://upload.example.com/put", headers: [] },
					download: "http://upload.example.com/file",
				}),
			}),
		);

		await expect(uploader.upload(file())).rejects.toThrow(
			"insecure http:// URL",
		);
	});
});
