import type { ScrapingConfig } from "../types/schemas";

export const DEFAULT_CONFIG: ScrapingConfig = {
	viewport: { width: 1080, height: 1024 },
	timeout: 30000,
	headless: false,
};

export const SELECTORS = {
	LISTING_GRID: '[data-testid="listing-grid"] [data-testid="l-card"]',
	TITLE: '[data-cy="ad-card-title"] h4',
	PRICE: '[data-testid="ad-price"]',
	LOCATION: '[data-testid="location-date"]',
	LINK: "a.css-1tqlkj0",
} as const;
