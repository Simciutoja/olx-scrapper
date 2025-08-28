import chalk from "chalk";
import figlet from "figlet";
import ora from "ora";
import cron from "node-cron";
import { OLXScraper } from "./scrapers/OLXScraper";
import { displayResults } from "./utils/display";
import { handleError } from "./utils/errorHandler";
import { getUserInput } from "./utils/input";
import logger from "./utils/logger";
import { notifyNewOffers } from "./utils/notify";
import { cron_time } from "./config/constants";

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
                    if (!latestDate || o.date.getTime() > latestDate.getTime()) latestDate = o.date;
                });
                spinner.succeed(`✅ Zakończono pierwsze skanowanie. Załadowano ${offers.length} ofert.`);
                displayResults(offers);
                if (saveToFile) await saveOffersToFile(offers, "olx_offers");
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
                const recent = refDate ? offers.filter((o) => o.date.getTime() >= refDate.getTime()) : offers.slice();
                const newOffers = recent.filter((o) => !seenIds.has(o.id));
                if (newOffers.length) {
                    newOffers.forEach((o) => {
                        seenIds.add(o.id);
                        if (!latestDate || o.date.getTime() > latestDate.getTime()) latestDate = o.date;
                    });
                    logger.info(`Znaleziono ${newOffers.length} nowych ofert.`);
                    displayResults(newOffers);
                    await notifyNewOffers(
                        newOffers.map((o) => ({ title: o.title, url: o.url })),
                        { discordWebhookUrl: process.env.DISCORD_WEBHOOK || null }
                    );
                    if (saveToFile) await saveOffersToFile(newOffers, "olx_new_offers");
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

async function saveOffersToFile(offers: any[], prefix: string) {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dataDir = "data";
    await fs.mkdir(dataDir, { recursive: true });
    const filePath = path.join(dataDir, `${prefix}_${Date.now()}.json`);
    await fs.writeFile(filePath, JSON.stringify(offers, null, 2));
    logger.info(`Oferty zapisane do pliku: ${filePath}`);
}


main().catch((error) => {
    handleError(error);
    process.exit(1);
});
