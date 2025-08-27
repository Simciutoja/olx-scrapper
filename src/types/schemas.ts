import { z } from "zod";

export const URLInputSchema = z.object({
	url: z
		.string()
		.min(1, "URL jest wymagany")
		.url("Nieprawidłowy format URL")
		.refine((url) => url.includes("olx.pl"), "URL musi być z domeny OLX.pl"),
	saveToFile: z.boolean().optional(),
});

export const OfferSchema = z.object({
	title: z.string(),
	price: z.string(),
	location: z.string(),
	url: z.string().url(),
	date: z.date(),
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
