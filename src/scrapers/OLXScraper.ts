import puppeteer, { Browser, Page } from "puppeteer";
import crypto from "node:crypto";
import { DEFAULT_CONFIG, SELECTORS } from "../config/constants";
import { ScrapingError } from "../errors/ScrapingError";
import {
    Offer,
    RawOffer,
    OfferSchema,
    ScrapingConfig,
    ScrapingConfigSchema,
} from "../types/schemas";
import logger from "../utils/logger";

export class OLXScraper {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private config: ScrapingConfig;

    constructor(config: Partial<ScrapingConfig> = {}) {
        this.config = ScrapingConfigSchema.parse({
            ...DEFAULT_CONFIG,
            ...config,
        });
    }

    async initialize(url: string): Promise<void> {
        try {
            this.browser = await puppeteer.launch({
                headless: this.config.headless,
                timeout: this.config.timeout,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-infobars",
                    "--window-position=0,0",
                    "--ignore-certificate-errors",
                    "--ignore-certificate-errors-spki-list",
                    `--window-size=${this.config.viewport.width},${this.config.viewport.height}`,
                ],
            });

            this.page = await this.browser.newPage();
            await this.page.setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
            );
            await this.page.setViewport(this.config.viewport);

            await this.page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, "webdriver", { get: () => undefined });
            });

            await this.page.goto(url, {
                waitUntil: "networkidle2",
                timeout: this.config.timeout,
            });
        } catch (error) {
            logger.error("Initialization error:", error);
            await this.cleanup();
            throw new ScrapingError("Failed to initialize browser");
        }
    }

    async scrapeOffers(): Promise<Offer[]> {
        if (!this.page) {
            throw new ScrapingError("Page not initialized. Call initialize() first.");
        }
        try {
            await this.page.waitForSelector(SELECTORS.LISTING_GRID, {
                timeout: this.config.timeout,
            });

            const rawOffers: RawOffer[] = await this.page.evaluate((selectors) => {
                const offerNodes = document.querySelectorAll(selectors.LISTING_GRID);
                return Array.from(offerNodes).map((card) => {
                    const getText = (sel: string) =>
                        card.querySelector(sel)?.textContent?.trim() || "";
                    const title = getText(selectors.TITLE);
                    const price = getText(selectors.PRICE);
                    const location = getText(selectors.LOCATION);
                    const urlElement = card.querySelector(selectors.LINK);
                    const urlPart = urlElement?.getAttribute("href") || "";
                    const url = urlPart.startsWith("http")
                        ? urlPart
                        : `https://www.olx.pl${urlPart}`;

                    return { title, price, location, url, date: null };
                });
            }, SELECTORS);

            logger.info(`Successfully extracted ${rawOffers.length} raw offers`);
            if (!rawOffers.length) {
                logger.warn("No offers found on the page");
                return [];
            }

            const offers = rawOffers.map((offer) => ({
                ...offer,
                date: this.parseDateFromLocation(offer.location),
                id: this.extractIdFromUrl(offer.url) ||
                    this.hashOffer(offer.title, offer.price, offer.location),
            }));

            return this.validateOffers(offers);
        } catch (error) {
            logger.error("Detailed scraping error:", error);
            throw new ScrapingError(
                `Failed to scrape offers: ${(error as Error).message || "Unknown error"}`
            );
        }
    }

    async cleanup(): Promise<void> {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
            }
        } catch (error) {
            logger.error("Error during cleanup:", error);
        }
    }

    async scrape(url: string): Promise<Offer[]> {
        try {
            await this.initialize(url);
            const offers = await this.scrapeOffers();
            await this.cleanup();
            return offers;
        } catch (error) {
            await this.cleanup();
            throw error;
        }
    }

    // ----------- Private Utils ------------

    private parseDateFromLocation(location: string): Date {
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
                    minutes
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
                    this.parsePolishMonth(month),
                    parseInt(day, 10)
                );
            }
        }

        const dateMatch = dateStr.match(/(\d{1,2}) (\w+) (\d{4})/);
        if (dateMatch) {
            const [_, day, month, year] = dateMatch;
            return new Date(
                parseInt(year, 10),
                this.parsePolishMonth(month),
                parseInt(day, 10)
            );
        }

        return today;
    }

    private parsePolishMonth(month: string): number {
        const months: Record<string, number> = {
            stycznia: 0, lutego: 1, marca: 2, kwietnia: 3, maja: 4, czerwca: 5,
            lipca: 6, sierpnia: 7, września: 8, października: 9, listopada: 10, grudnia: 11,
        };
        return months[month.toLowerCase()] ?? 0;
    }

    private extractIdFromUrl(url: string): string | null {
        try {
            const match = url.match(/-(\d+)\/?(?:\?.*)?$/);
            if (match) return match[1];
            const anyNum = url.match(/(\d{6,})/);
            return anyNum ? anyNum[1] : null;
        } catch {
            return null;
        }
    }

    private hashOffer(title: string, price: string, location: string): string {
        return crypto.createHash("sha256")
            .update(`${title}|${price}|${location}`)
            .digest("hex");
    }

    private validateOffers(rawOffers: RawOffer[]): Offer[] {
        const validOffers: Offer[] = [];
        rawOffers.forEach((offer) => {
            try {
                validOffers.push(
                    OfferSchema.parse({
                        ...offer,
                        date: offer.date ?? new Date(),
                    })
                );
            } catch (error) {
                logger.warn(`Skipping invalid offer: ${offer.title}`, error);
            }
        });
        return validOffers;
    }
}
