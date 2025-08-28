import { ScrapingError } from "../errors/ScrapingError";
import logger from "./logger";

type NormalizedError = {
	type: string;
	name?: string;
	message?: string;
	stack?: string | undefined;
	code?: string;
	context?: Record<string, unknown>;
};

function normalizeError(err: unknown): NormalizedError {
	if (err instanceof ScrapingError)
		return {
			type: "ScrapingError",
			...err.toJSON(),
			stack: err.stack,
		} as NormalizedError;
	if (err instanceof Error)
		return {
			type: "Error",
			name: err.name,
			message: err.message,
			stack: err.stack,
		};
	return { type: typeof err, message: String(err) };
}

export function handleError(error: unknown): void {
	const normalized = normalizeError(error);
	const meta: Record<string, unknown> = { normalized };
	if (normalized.context) meta.context = normalized.context;
	if (normalized.code) meta.code = normalized.code;
	logger.error(normalized.message || "Unexpected error", meta);
}
