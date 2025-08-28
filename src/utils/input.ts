import prompts from "prompts";
import { z } from "zod";
import { type URLInput, URLInputSchema } from "../types/schemas";
import logger from "./logger";

async function extracted(urlResponse: prompts.Answers<string>) {
	const hasExistingSorting =
		urlResponse.url.includes("search%5Border%5D") ||
		urlResponse.url.includes("search[order]");

	let finalUrl = urlResponse.url;

	if (!hasExistingSorting) {
		const sortResponse = await prompts({
			type: "select",
			name: "sorting",
			message: "📅 Jak chcesz sortować ogłoszenia?",
			choices: [
				{ title: "Od najnowszych (domyślne)", value: "created_at:desc" },
				{ title: "Od najstarszych", value: "created_at:asc" },
				{ title: "Bez sortowania", value: null },
			],
			initial: 0,
		});

		if (sortResponse.sorting) {
			finalUrl = addSortingToUrl(urlResponse.url, sortResponse.sorting);
		}
	}
	return finalUrl;
}

export async function getUserInput(): Promise<URLInput> {
	const urlResponse = await prompts({
		type: "text",
		name: "url",
		message: "🔗 Podaj URL do ogłoszeń na OLX:",
		validate: (value: string) => {
			try {
				URLInputSchema.parse({ url: value });
				return true;
			} catch (error) {
				if (error instanceof z.ZodError) {
					return error.errors[0]?.message || "Nieprawidłowy URL";
				}
				return "Wystąpił błąd podczas walidacji";
			}
		},
	});

	if (!urlResponse.url) {
		throw new Error("URL nie został podany");
	}

	const finalUrl = await extracted(urlResponse);

	const saveResponse = await prompts({
		type: "confirm",
		name: "save",
		message: "💾 Czy chcesz zapisać ten URL do pliku?",
		initial: false,
	});

	return URLInputSchema.parse({ url: finalUrl, saveToFile: saveResponse.save });
}

function addSortingToUrl(url: string, sorting: string): string {
	try {
		const urlObj = new URL(url);
		urlObj.searchParams.set("search[order]", sorting);
		return urlObj.toString();
	} catch (error) {
		logger.warn("Nie udało się przetworzyć URL", {
			message: (error as Error)?.message,
		});
		return url;
	}
}
