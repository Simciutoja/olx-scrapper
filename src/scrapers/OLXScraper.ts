import puppeteer, {type Browser, type Page} from "puppeteer";
import {DEFAULT_CONFIG, SELECTORS} from "../config/constants";
import {ScrapingError} from "../errors/ScrapingError";
import {type Offer, type RawOffer, OfferSchema, type ScrapingConfig, ScrapingConfigSchema,} from "../types/schemas";
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
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-infobars',
                    '--window-position=0,0',
                    '--ignore-certifcate-errors',
                    '--ignore-certifcate-errors-spki-list',
                    `--window-size=${this.config.viewport.width},${this.config.viewport.height}`
                ]
            });

            this.page = await this.browser.newPage();

            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');


            await this.page.setViewport(this.config.viewport);

            await this.page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
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

            const rawOffers = await this.page.evaluate((selectors) => {
                const offerNodes = document.querySelectorAll(selectors.LISTING_GRID);

                return Array.from(offerNodes).map((card) => {
                    const title = card.querySelector(selectors.TITLE)?.textContent?.trim() || "";
                    const price = card.querySelector(selectors.PRICE)?.textContent?.trim() || "";
                    const locationDate = card.querySelector(selectors.LOCATION)?.textContent?.trim() || "";
                    const urlElement = card.querySelector(selectors.LINK);
                    const urlPart = urlElement?.getAttribute("href") || "";
                    const url = urlPart.startsWith("http") ? urlPart : `https://www.olx.pl${urlPart}`;

                    return {
                        title,
                        price,
                        location: locationDate,
                        url,
                        date: null
                    };
                });
            }, SELECTORS);

            logger.info(`Successfully extracted ${rawOffers.length} raw offers`);

            if (rawOffers.length === 0) {
                logger.warn("No offers found on the page");
                return [];
            }

            const offersWithDates = rawOffers.map(offer => ({
                ...offer,
                date: this.parseDateFromLocation(offer.location)
            }));

            return this.validateOffers(offersWithDates);
        } catch (error) {
            logger.error("Detailed scraping error:", error);
            if (error instanceof Error) {
                throw new ScrapingError(`Failed to scrape offers: ${error.message}`);
            }
            throw new ScrapingError("Failed to scrape offers: Unknown error");
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

    private parseDateFromLocation(location: string): Date {
        const today = new Date();
        const splitLocation = location.split(" - ");
        const dateStr = splitLocation[splitLocation.length - 1];

        if (dateStr.includes("Dzisiaj")) {
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

        if (dateStr.includes("Odświeżono")) {
            const dateMatch = dateStr.match(/(\d{1,2}) (\w+) (\d{4})/);
            if (dateMatch) {
                const day = parseInt(dateMatch[1], 10);
                const month = this.parsePolishMonth(dateMatch[2]);
                const year = parseInt(dateMatch[3], 10);
                return new Date(year, month, day);
            }
        }

        const dateMatch = dateStr.match(/(\d{2}) (\w+) (\d{4})/);
        if (dateMatch) {
            const day = parseInt(dateMatch[1], 10);
            const month = this.parsePolishMonth(dateMatch[2]);
            const year = parseInt(dateMatch[3], 10);
            return new Date(year, month, day);
        }

        return today;
    }

    private parsePolishMonth(month: string): number {
        const months: { [key: string]: number } = {
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
        return months[month.toLowerCase()] || 0;
    }


    private async validateOffers(rawOffers: RawOffer[]): Promise<Offer[]> {
        const validOffers: Offer[] = [];
        const errors: string[] = [];

        rawOffers.forEach((offer) => {
            try {
                const validatedOffer = OfferSchema.parse({
                    ...offer,
                    date: offer.date || new Date()
                });
                validOffers.push(validatedOffer);
            } catch (error) {
                errors.push(`Offer validation failed: ${offer.title}`);
                logger.warn(`Skipping invalid offer: ${offer.title}`, error);
            }
        });

        if (errors.length > 0) {
            logger.warn(`Found ${errors.length} invalid offers that were skipped`);
        }

        return validOffers;
    }
}
