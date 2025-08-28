import chalk from "chalk";
import figlet from "figlet";
import cron from "node-cron";
import ora from "ora";
import type { ZodSafeParseSuccess } from "zod";
import { cron_time } from "./config/constants";
import { OLXScraper } from "./scrapers/OLXScraper";
import type { Offer } from "./types/schemas";
import { OfferSchema } from "./types/schemas";
import { displayResults } from "./utils/display";
import { handleError } from "./utils/errorHandler";
import { getUserInput } from "./utils/input";
import logger from "./utils/logger";
import { notifyNewOffers } from "./utils/notify";

export async function main(): Promise<void> {
	displayBanner();

	try {
		const { url, saveToFile } = await getUserInput();
		const spinner = ora("🔍 Rozpoczynanie skanowania...").start();
		const seenIds = new Set<string>();
		let latestDate: Date | null = null;

		async function runInitialScan() {
			spinner.text = "🌐 Inicjalizacja przeglądarki...";
			const scraper = new OLXScraper({ headless: true, timeout: 30000 });
			try {
				spinner.text = "🌐 Pierwsze pobieranie ofert...";
				const offers = await scraper.scrape(url);
				if (!offers.length) {
					spinner.fail("Nie znaleziono żadnych ofert.");
					return;
				}
				offers.forEach((o) => {
					seenIds.add(o.id);
					if (!latestDate || o.date.getTime() > latestDate.getTime())
						latestDate = o.date;
				});

				const parsed = offers.map((o) => OfferSchema.safeParse(o));
				const validated = parsed
					.filter((r): r is ZodSafeParseSuccess<Offer> => r.success)
					.map((r) => r.data);

				if (validated.length !== offers.length) {
					logger.warn(
						"Some scraped offers failed validation and were ignored",
						{
							expected: offers.length,
							valid: validated.length,
						},
					);
				}
				spinner.succeed(
					`✅ Zakończono pierwsze skanowanie. Załadowano ${validated.length} ofert.`,
				);
				displayResults(validated);
				if (saveToFile) await saveOffersToFile(validated, "olx_offers");
			} catch (error) {
				handleError(error);
			} finally {
				await scraper.cleanup();
			}
		}

		async function runScheduledScan() {
			const scraper = new OLXScraper({ headless: true, timeout: 30000 });
			try {
				const offers = await scraper.scrape(url);
				if (!offers.length) return;
				const refDate = latestDate;
				const recent = refDate
					? offers.filter((o) => o.date.getTime() >= refDate.getTime())
					: offers.slice();
				const newOffers = recent.filter((o) => !seenIds.has(o.id));
				if (newOffers.length) {
					const parsedNew = newOffers.map((o) => OfferSchema.safeParse(o));
					const validatedNew = parsedNew
						.filter((r): r is ZodSafeParseSuccess<Offer> => r.success)
						.map((r) => r.data);

					if (validatedNew.length !== newOffers.length) {
						logger.warn("Some new offers failed validation and were ignored", {
							expected: newOffers.length,
							valid: validatedNew.length,
						});
					}

					validatedNew.forEach((o) => {
						seenIds.add(o.id);
						if (!latestDate || o.date.getTime() > latestDate.getTime())
							latestDate = o.date;
					});
					logger.info(`Znaleziono ${validatedNew.length} nowych ofert.`);
					displayResults(validatedNew);
					const notifyPayload = validatedNew.map((o) => ({
						title: o.title,
						url: o.url,
					}));
					await notifyNewOffers(notifyPayload, {
						discordWebhookUrl: process.env.DISCORD_WEBHOOK || null,
					});
					if (saveToFile)
						await saveOffersToFile(validatedNew, "olx_new_offers");
				} else {
					logger.info("Brak nowych ofert tym razem.");
				}
			} catch (error) {
				handleError(error);
			} finally {
				await scraper.cleanup();
			}
		}

		await runInitialScan();
		cron.schedule(cron_time, () => {
			logger.info("Uruchamianie zaplanowanego skanu...");
			runScheduledScan().catch(handleError);
		});
		logger.info("Monitor ofert OLX uruchomiony. Oczekiwanie na nowe oferty...");
	} catch (error) {
		handleError(error);
		process.exit(1);
	}
}

function displayBanner() {
	const banner = figlet.textSync("OLX - SCRAPPER", {
		font: "Standard",
		horizontalLayout: "default",
		verticalLayout: "default",
	});
	console.log(chalk.red.bold(banner) + "\n");
}

async function saveOffersToFile(offers: Offer[], prefix: string) {
	const fs = await import("node:fs/promises");
	const path = await import("node:path");
	const dataDir = "data";
	await fs.mkdir(dataDir, { recursive: true });
	const filePath = path.join(dataDir, `${prefix}_${Date.now()}.json`);
	await fs.writeFile(filePath, JSON.stringify(offers, null, 2));
	logger.info("Oferty zapisane do pliku", {
		path: filePath,
		count: offers.length,
	});
}

export function detectNewOffers(
	seenIds: Set<string>,
	offers: Offer[],
	since?: Date | null,
) {
	const refDate = since;
	const recent = refDate
		? offers.filter((o) => o.date.getTime() >= refDate.getTime())
		: offers.slice();
	return recent.filter((o) => !seenIds.has(o.id));
}

export { saveOffersToFile };

main().catch((error) => {
	handleError(error);
	process.exit(1);
});
