import puppeteer, { type Browser, type Page } from "puppeteer";
import { DEFAULT_CONFIG, SELECTORS } from "../config/constants";
import { ScrapingError } from "../errors/ScrapingError";
import {
	type Offer,
	OfferSchema,
	type ScrapingConfig,
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
			});

			this.page = await this.browser.newPage();
			await this.page.setViewport(this.config.viewport);

			await this.page.goto(url, {
				waitUntil: "networkidle2",
				timeout: this.config.timeout,
			});
		} catch (_error) {
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

			const rawOffers = await this.page.evaluate(this.extractOffersFromDOM);
			return this.validateOffers(rawOffers);
		} catch (_error) {
			throw new ScrapingError("Failed to scrape offers");
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

	private extractOffersFromDOM = () => {
		const offerNodes = document.querySelectorAll(
			'[data-testid="listing-grid"] [data-testid="l-card"]',
		);

		return Array.from(offerNodes).map((card) => {
			const title =
				card
					.querySelector('[data-cy="ad-card-title"] h4')
					?.textContent?.trim() || "";
			const price =
				card.querySelector('[data-testid="ad-price"]')?.textContent?.trim() ||
				"";
			const location =
				card
					.querySelector('[data-testid="location-date"]')
					?.textContent?.trim() || "";
			const urlPart =
				card.querySelector("a.css-1tqlkj0")?.getAttribute("href") || "";
			const url = urlPart.startsWith("http")
				? urlPart
				: `https://www.olx.pl${urlPart}`;

			return { title, price, location, url };
		});
	};

	private async validateOffers(rawOffers: unknown[]): Promise<Offer[]> {
		const validOffers: Offer[] = [];
		const errors: string[] = [];

		rawOffers.forEach((offer: any) => {
			try {
				const offerWithDate = {
					...offer,
					date: this.parseDateFromLocation(offer.location),
				};
				const validatedOffer = OfferSchema.parse(offerWithDate);
				validOffers.push(validatedOffer);
			} catch (error) {
				errors.push(`Offer: Invalid data structure`);
				logger.warn(` Skipping invalid offer:`, error);
			}
		});

		if (errors.length > 0) {
			logger.warn(`Found ${errors.length} invalid offers that were skipped`);
		}

		return validOffers;
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
}
