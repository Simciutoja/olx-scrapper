import crypto from "node:crypto";
import type { Offer, RawOffer } from "../types/schemas";
import { OfferSchema } from "../types/schemas";
import logger from "../utils/logger";

export function extractIdFromUrl(url: string): string | null {
	try {
		const match = url.match(/-(\d+)\/?(?:\?.*)?$/);
		if (match) return match[1];
		const anyNum = url.match(/(\d{6,})/);
		return anyNum ? anyNum[1] : null;
	} catch {
		return null;
	}
}

export function hashOffer(
	title: string,
	price: string,
	location: string,
): string {
	return crypto
		.createHash("sha256")
		.update(`${title}|${price}|${location}`)
		.digest("hex");
}

function parsePolishMonth(month: string): number {
	const months: Record<string, number> = {
		stycznia: 0,
		lutego: 1,
		marca: 2,
		kwietnia: 3,
		maja: 4,
		czerwca: 5,
		lipca: 6,
		sierpnia: 7,
		września: 8,
		października: 9,
		listopada: 10,
		grudnia: 11,
	};
	return months[month.toLowerCase()] ?? 0;
}

export function parseDateFromLocation(location: string): Date {
	const today = new Date();
	const localeParts = location.split(" - ");
	const dateStr = localeParts[localeParts.length - 1];

	if (/Dzisiaj/.test(dateStr)) {
		const timeMatch = dateStr.match(/\d{2}:\d{2}/);
		if (timeMatch) {
			const [hours, minutes] = timeMatch[0].split(":").map(Number);
			return new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate(),
				hours,
				minutes,
			);
		}
		return today;
	}

	if (/Odświeżono/.test(dateStr)) {
		const dateMatch = dateStr.match(/(\d{1,2}) (\w+) (\d{4})/);
		if (dateMatch) {
			const [_, day, month, year] = dateMatch;
			return new Date(
				parseInt(year, 10),
				parsePolishMonth(month),
				parseInt(day, 10),
			);
		}
	}

	const dateMatch = dateStr.match(/(\d{1,2}) (\w+) (\d{4})/);
	if (dateMatch) {
		const [_, day, month, year] = dateMatch;
		return new Date(
			parseInt(year, 10),
			parsePolishMonth(month),
			parseInt(day, 10),
		);
	}

	return today;
}

export function validateOffers(rawOffers: RawOffer[]): Offer[] {
	const validOffers: Offer[] = [];
	rawOffers.forEach((offer) => {
		try {
			validOffers.push(
				OfferSchema.parse({
					...offer,
					date: offer.date ?? new Date(),
				}),
			);
		} catch (error) {
			logger.warn(`Skipping invalid offer: ${offer.title}`, {
				message: (error as Error)?.message,
			});
		}
	});
	return validOffers;
}
