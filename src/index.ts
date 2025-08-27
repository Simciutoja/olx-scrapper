import logSymbols from "log-symbols";
import ora from "ora";
import { OLXScraper } from "./scrapers/OLXScraper";
import { displayResults } from "./utils/display";
import { handleError } from "./utils/errorHandler";
import { getUserInput } from "./utils/input";
import logger from "./utils/logger";

export async function main(): Promise<void> {
	try {
		const { url, saveToFile } = await getUserInput();
		const spinner = ora("🔍 Rozpoczynanie skanowania...").start();
		spinner.text = "🌐 Inicjalizacja przeglądarki...";

		const scraper = new OLXScraper({
			headless: true,
			timeout: 30000,
		});

		spinner.text = "🌐 Pobieranie ofert";

		const offers = await scraper.scrape(url);

		if (offers.length === 0) {
			spinner.fail(`${logSymbols.error} Nie znaleziono żadnych ofert.`);
			return;
		}

		spinner.succeed(
			`Zakończono skanowanie. Znaleziono ${offers.length} ofert.`,
		);
		displayResults(offers);
		if (saveToFile) {
			const fs = await import("node:fs/promises");
			const path = require("node:path");

			const dataDir = "data";
			await fs.mkdir(dataDir, { recursive: true });

			const filePath = path.join(dataDir, `olx_offers_${Date.now()}.json`);
			await fs.writeFile(filePath, JSON.stringify(offers, null, 2));
			logger.info(`Oferty zapisane do pliku: ${filePath}`);
		}
	} catch (error) {
		handleError(error);
		process.exit(1);
	}
}

if (require.main === module) {
	main().catch(handleError);
}
