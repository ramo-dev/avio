import { describe, expect, it } from "vitest";
import { formatDuration } from "#/lib/format/time";

describe("formatDuration", () => {
	it("formats short durations", () => {
		expect(formatDuration(0)).toBe("0:00");
		expect(formatDuration(9.8)).toBe("0:09");
		expect(formatDuration(65)).toBe("1:05");
	});

	it("formats hour-long durations", () => {
		expect(formatDuration(3661)).toBe("1:01:01");
	});

	it("handles invalid values", () => {
		expect(formatDuration(Number.NaN)).toBe("0:00");
		expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("0:00");
		expect(formatDuration(-4)).toBe("0:00");
	});
});
