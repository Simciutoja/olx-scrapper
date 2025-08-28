import * as fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { saveOffersToFile } from "../src";

vi.mock("node:fs/promises", () => {
	const m = {
		mkdir: vi.fn().mockResolvedValue(undefined),
		writeFile: vi.fn().mockResolvedValue(undefined),
	};
	return {
		__esModule: true,
		default: m,
		...m,
	};
});

describe("saveOffersToFile", () => {
	it("creates data dir and writes file", async () => {
		const offers = [
			{
				title: "t",
				price: "p",
				location: "l",
				url: "https://olx.pl/1",
				id: "1",
				date: new Date(),
			},
		];
		await saveOffersToFile(offers as any, "testprefix");
		expect(fs.mkdir as any).toHaveBeenCalledWith("data", { recursive: true });
		expect(fs.writeFile as any).toHaveBeenCalled();
	});
});
