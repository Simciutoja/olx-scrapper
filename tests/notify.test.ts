import axios from "axios";
import notifier from "node-notifier";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as notify from "../src/utils/notify";

vi.mock("node-notifier", () => {
	return {
		__esModule: true,
		default: {
			notify: vi.fn(),
		},
	};
});

vi.mock("axios", () => {
	return {
		__esModule: true,
		default: {
			post: vi.fn(),
		},
		post: vi.fn(),
	};
});

describe("notifyNewOffers", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("does nothing for empty list", async () => {
		await notify.notifyNewOffers([]);
		expect(notifier.notify).not.toHaveBeenCalled();
		expect(axios.post).not.toHaveBeenCalled();
	});

	it("sends system notification and discord webhook when options provided", async () => {
		const offers = [{ title: "X", url: "https://olx.pl/1" }];
		(axios.post as any).mockResolvedValue({ status: 200 });
		await notify.notifyNewOffers(offers, {
			discordWebhookUrl: "https://dummy",
		});
		expect(notifier.notify).toHaveBeenCalled();
		expect(axios.post).toHaveBeenCalledWith(
			"https://dummy",
			expect.any(Object),
		);
	});

	it("handles invalid options gracefully", async () => {
		const offers = [{ title: "X", url: "https://olx.pl/1" }];
		await notify.notifyNewOffers(offers, {
			discordWebhookUrl: "not-a-url",
		} as any);
		expect(notifier.notify).toHaveBeenCalled();
	});
});
