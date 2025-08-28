import { describe, expect, it } from "vitest";
import {
	extractIdFromUrl,
	hashOffer,
	parseDateFromLocation,
	validateOffers,
} from "../src/scrapers/olxUtils";

describe("OLXScraper utilities", () => {
	it("extracts numeric id from typical OLX url suffix", () => {
		const url = "https://www.olx.pl/oferta/super-bike-abc-1234567890/";
		const id = extractIdFromUrl(url);
		expect(id).toBe("1234567890");
	});

	it("extracts any long number if no dash-id present", () => {
		const url = "https://www.olx.pl/oferta/offer/9876543210987-details";
		const id = extractIdFromUrl(url);
		expect(id).toBe("9876543210987");
	});

	it("returns null for non-matching urls", () => {
		const url = "not-a-url";
		const id = extractIdFromUrl(url);
		expect(id).toBeNull();
	});

	it("hashes offers deterministically", () => {
		const h1 = hashOffer("a", "1", "loc");
		const h2 = hashOffer("a", "1", "loc");
		const h3 = hashOffer("b", "1", "loc");
		expect(typeof h1).toBe("string");
		expect(h1).toBe(h2);
		expect(h1).not.toBe(h3);
	});

	it('parses "Dzisiaj" locations with time', () => {
		const todayStr = "Miasto - Dzisiaj 12:34";
		const d = parseDateFromLocation(todayStr);
		expect(d.getHours()).toBe(12);
		expect(d.getMinutes()).toBe(34);
	});

	it("parses explicit Polish date", () => {
		const dateStr = "Miasto - 3 lipca 2020";
		const d = parseDateFromLocation(dateStr);
		expect(d.getFullYear()).toBe(2020);
		expect(d.getDate()).toBe(3);
		expect(d.getMonth()).toBe(6);
	});

	it("validateOffers skips invalid offers", () => {
		const raw = [
			{
				title: "t",
				price: "p",
				location: "l",
				url: "https://www.olx.pl/1",
				id: "1",
				date: new Date(),
			},
			{
				title: "",
				price: "p",
				location: "l",
				url: "invalid",
				id: "2",
				date: null,
			},
		];
		const validated = validateOffers(raw as any);
		expect(validated.length).toBe(1);
		expect(validated[0].id).toBe("1");
	});
});
