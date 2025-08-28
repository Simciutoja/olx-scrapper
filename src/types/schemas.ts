import { z } from "zod";

export const URLInputSchema = z.object({
	url: z
		.string()
		.min(1, "URL jest wymagany")
		.url("Nieprawidłowy format URL")
		.refine((url) => url.includes("olx.pl"), "URL musi być z domeny OLX.pl"),
	saveToFile: z.boolean().optional(),
});

export interface RawOffer {
	title: string;
	price: string;
	location: string;
	url: string;
	date: Date | null;
}

export const OfferSchema = z.object({
	title: z.string().min(1, "Tytuł jest wymagany"),
	price: z.string().min(1, "Cena jest wymagana"),
	location: z.string().min(1, "Lokalizacja jest wymagana"),
	url: z.string().url("Nieprawidłowy format URL"),
	date: z.date({
		required_error: "Data jest wymagana",
		invalid_type_error: "Nieprawidłowy format daty",
	}).default(() => new Date()),
});

export const ScrapingConfigSchema = z.object({
	viewport: z.object({
		width: z.number().positive(),
		height: z.number().positive(),
	}),
	timeout: z.number().positive().default(30000),
	headless: z.boolean().default(false),
});

export type Offer = z.infer<typeof OfferSchema>;
export type URLInput = z.infer<typeof URLInputSchema>;
export type ScrapingConfig = z.infer<typeof ScrapingConfigSchema>;
