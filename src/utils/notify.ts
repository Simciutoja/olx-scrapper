import notifier from "node-notifier";
import axios from "axios";
import logger from "./logger";

export type NotifyOptions = {
	discordWebhookUrl?: string | null;
};

export async function notifyNewOffers(
	offers: { title: string; url: string }[],
	options: NotifyOptions = {},
): Promise<void> {
	if (offers.length === 0) return;

	const summary = `${offers.length} new OLX offer(s)`;
	const message = offers
		.slice(0, 5)
		.map((o) => `${o.title} - ${o.url}`)
		.join("\n");


	try {
		notifier.notify({
			title: summary,
			message: offers[0].title,
			open: offers[0].url,
		});
	} catch (error) {
		logger.warn("System notification failed:", error);
	}

	if (options.discordWebhookUrl) {
		try {
			await axios.post(options.discordWebhookUrl, {
				content: `**${summary}**\n${message}`,
			});
		} catch (error) {
			logger.warn("Failed to send Discord webhook:", error);
		}
	}
}
