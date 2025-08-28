import {ScrapingError} from "../errors/ScrapingError";
import logger from "./logger";

export function handleError(error: unknown): void {
    logger.error(error);

    if (error instanceof ScrapingError) {
        logger.error(`${error.message}`);
    } else if (error instanceof Error) {
        logger.error(`${error.message}`);
    } else {
        logger.error(
            `Nieznany błąd: ${error instanceof Error ? error.message : String(error)}`,
        );
    }

    logger.error(
        `Nieznany błąd: ${error instanceof Error ? error.message : String(error)}`,
    );
}
