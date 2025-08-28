import Table from "cli-table3";
import type { Offer } from "../types/schemas";
import { OfferSchema } from "../types/schemas";
import logger from "./logger";

function formatDate(date: Date): string {
	return date.toLocaleDateString("pl-PL", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function displayResults(offers: Offer[]): void {
	const table = new Table({
		head: ["Tytuł", "Cena", "Lokalizacja", "Data", "Link"],
		colWidths: [40, 15, 25, 25, 60],
		wordWrap: true,
		style: {
			head: ["cyan"],
			border: ["grey"],
		},
	});

	const validated = offers
		.map((o) => OfferSchema.safeParse(o))
		.filter((r) => r.success)
		.map((r) => r as { success: true; data: Offer })
		.map((r) => r.data);

	if (validated.length === 0) {
		logger.warn("No valid offers to display");
		return;
	}

	const sortedOffers = validated.sort((a, b) => {
		return new Date(b.date).getTime() - new Date(a.date).getTime();
	});

	sortedOffers.forEach((offer) => {
		table.push([
			offer.title,
			offer.price,
			offer.location.split(" - ")[0],
			formatDate(offer.date),
			offer.url,
		]);
	});

	console.log(table.toString());
}
