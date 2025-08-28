import axios from "axios";
import notifier from "node-notifier";
import { NotifyOptionsSchema, NotifyPayloadSchema } from "../types/schemas";
import logger from "./logger";

export async function notifyNewOffers(
	offers: { title: string; url: string }[],
	options: unknown = {},
): Promise<void> {
	if (!Array.isArray(offers) || offers.length === 0) return;

	const parsedOptions = (() => {
		try {
			return NotifyOptionsSchema.parse(options);
		} catch (e) {
			logger.warn("Invalid notify options provided, falling back to defaults", {
				message: (e as Error)?.message,
			});
			return {};
		}
	})();

	const summary = `${offers.length} new OLX offer(s)`;
	const message = offers
		.slice(0, 5)
		.map((o) => `${o.title} - ${o.url}`)
		.join("\n");

	try {
		const first = NotifyPayloadSchema.parse(offers[0]);
		notifier.notify({
			title: summary,
			message: first.title,
			open: first.url,
		});
	} catch (error) {
		logger.warn("System notification failed or payload invalid", {
			message: (error as Error)?.message,
		});
	}

	if (parsedOptions.discordWebhookUrl) {
		try {
			await axios.post(parsedOptions.discordWebhookUrl, {
				content: `**${summary}**\n${message}`,
			});
		} catch (error) {
			logger.warn("Failed to send Discord webhook", {
				message: (error as Error)?.message,
				stack: (error as Error)?.stack,
			});
		}
	}
}
