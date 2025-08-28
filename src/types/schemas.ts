import { z } from "zod";

export const URLInputSchema = z.object({
	url: z
		.string()
		.min(1, "URL jest wymagany")
		.url("Nieprawidłowy format URL")
		.refine((url) => url.includes("olx.pl"), "URL musi być z domeny OLX.pl"),
	saveToFile: z.boolean().optional(),
});

export const RawOfferSchema = z.object({
	title: z.string().min(1, "Tytuł jest wymagany"),
	price: z.string().min(1, "Cena jest wymagana"),
	location: z.string().min(1, "Lokalizacja jest wymagana"),
	url: z.string().url("Nieprawidłowy format URL"),
	id: z.string().optional(),
	date: z.union([z.date(), z.null(), z.string()]).optional(),
});

export const OfferSchema = RawOfferSchema.extend({
	id: z.string().min(1, "Id oferty jest wymagane"),
	date: z
		.date()
		.default(() => new Date())
		.describe("Data dodania oferty"),
});

export const ScrapingConfigSchema = z.object({
	viewport: z.object({
		width: z.number().positive(),
		height: z.number().positive(),
	}),
	timeout: z.number().positive().default(30000),
	headless: z.boolean().default(false),
});

export const NotifyOptionsSchema = z.object({
	discordWebhookUrl: z.string().url().nullable().optional(),
});

export const NotifyPayloadSchema = z.object({
	title: z.string().min(1),
	url: z.string().url(),
});

export type Offer = z.infer<typeof OfferSchema>;
export type RawOffer = z.infer<typeof RawOfferSchema>;
export type URLInput = z.infer<typeof URLInputSchema>;
export type ScrapingConfig = z.infer<typeof ScrapingConfigSchema>;

export type NotifyOptions = z.infer<typeof NotifyOptionsSchema>;
export type NotifyPayload = z.infer<typeof NotifyPayloadSchema>;
