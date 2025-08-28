import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";
import { DEFAULT_CONFIG, SELECTORS } from "../config/constants";
import { ScrapingError } from "../errors/ScrapingError";
import type { Offer, RawOffer, ScrapingConfig } from "../types/schemas";
import { ScrapingConfigSchema } from "../types/schemas";
import logger from "../utils/logger";
import {
	extractIdFromUrl as utilExtractIdFromUrl,
	hashOffer as utilHashOffer,
	parseDateFromLocation as utilParseDateFromLocation,
	validateOffers as utilValidateOffers,
} from "./olxUtils";

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
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
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
			logger.error("Initialization error", {
				message: (error as Error)?.message,
				stack: (error as Error)?.stack,
			});
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

			const fnBody =
				"return Array.from(nodes).map(function(card){var q=function(s){var el=card.querySelector(s);return el && el.textContent?el.textContent.trim():''};var title=q(titleSel);var price=q(priceSel);var location=q(locSel);var urlElement=card.querySelector(linkSel);var urlPart=(urlElement && urlElement.getAttribute && urlElement.getAttribute('href'))||'';var url=(urlPart.indexOf('http')===0)?urlPart:'https://www.olx.pl'+urlPart;return {title:title,price:price,location:location,url:url,date:null}})";
			const cb = new Function(
				"nodes",
				"linkSel",
				"titleSel",
				"priceSel",
				"locSel",
				fnBody,
			) as unknown as (
				nodes: Element[],
				linkSel: string,
				titleSel: string,
				priceSel: string,
				locSel: string,
			) => unknown[];
			const rawOffers: RawOffer[] = (await this.page.$$eval(
				SELECTORS.LISTING_GRID,
				cb,
				SELECTORS.LINK,
				SELECTORS.TITLE,
				SELECTORS.PRICE,
				SELECTORS.LOCATION,
			)) as RawOffer[];

			logger.info(`Successfully extracted ${rawOffers.length} raw offers`);
			if (!rawOffers.length) {
				logger.warn("No offers found on the page");
				return [];
			}

			const offers = rawOffers.map((offer) => ({
				...offer,
				date: utilParseDateFromLocation(offer.location),
				id:
					utilExtractIdFromUrl(offer.url) ||
					utilHashOffer(offer.title, offer.price, offer.location),
			}));

			return utilValidateOffers(offers);
		} catch (error) {
			logger.error("Detailed scraping error", {
				message: (error as Error)?.message,
				stack: (error as Error)?.stack,
			});
			throw new ScrapingError(
				`Failed to scrape offers: ${(error as Error).message || "Unknown error"}`,
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
			logger.error("Error during cleanup", {
				message: (error as Error)?.message,
				stack: (error as Error)?.stack,
			});
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
