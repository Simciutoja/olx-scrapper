import { describe, expect, it } from "vitest";
import { detectNewOffers } from "../src";

describe("integration: scanning cycle", () => {
	it("detects only new offers between runs", () => {
		const seen = new Set<string>(["1"]);
		const older = new Date("2020-01-01");
		const offers = [
			{
				id: "1",
				title: "old",
				price: "1",
				location: "loc",
				url: "https://olx.pl/1",
				date: older,
			},
			{
				id: "2",
				title: "new",
				price: "2",
				location: "loc",
				url: "https://olx.pl/2",
				date: new Date(),
			},
		];

		const newOffers = detectNewOffers(seen, offers, older);
		expect(newOffers.map((o) => o.id)).toEqual(["2"]);
	});

	it("first run returns all offers when since is null", () => {
		const seen = new Set<string>();
		const offers = [
			{
				id: "a",
				title: "a",
				price: "1",
				location: "loc",
				url: "https://olx.pl/a",
				date: new Date(),
			},
			{
				id: "b",
				title: "b",
				price: "2",
				location: "loc",
				url: "https://olx.pl/b",
				date: new Date(),
			},
		];
		const result = detectNewOffers(seen, offers, null);
		expect(result.length).toBe(2);
	});
});
