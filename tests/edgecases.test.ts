import * as fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { saveOffersToFile } from "../src/index";
import { hashOffer } from "../src/scrapers/olxUtils";

vi.mock("node:fs/promises", () => {
	const m = {
		mkdir: vi.fn().mockResolvedValue(undefined),
		writeFile: vi.fn().mockResolvedValue(undefined),
		readFile: vi.fn().mockRejectedValue(new Error("corrupt")),
	};
	return {
		__esModule: true,
		default: m,
		...m,
	};
});

describe("edge cases", () => {
	it("detects duplicates where id is missing but hash matches", () => {
		const offers = [
			{
				id: "",
				title: "same",
				price: "1",
				location: "loc",
				url: "https://olx.pl/a",
				date: new Date(),
			},
			{
				id: "",
				title: "same",
				price: "1",
				location: "loc",
				url: "https://olx.pl/b",
				date: new Date(),
			},
		];

		const ids = offers.map((o) => hashOffer(o.title, o.price, o.location));
		expect(ids[0]).toBe(ids[1]);
	});

	it("handles corrupted saved files gracefully when reading (simulated)", async () => {
		const offers = [
			{
				id: "x",
				title: "x",
				price: "1",
				location: "l",
				url: "https://olx.pl/x",
				date: new Date(),
			},
		];
		await saveOffersToFile(offers as any, "edge");
		expect(fs.mkdir as any).toHaveBeenCalled();
		expect(fs.writeFile as any).toHaveBeenCalled();
	});
});
