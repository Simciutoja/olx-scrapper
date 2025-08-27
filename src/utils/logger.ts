import logSymbols from "log-symbols";

type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
	private formatMessage(level: LogLevel, message: unknown): string {
		const timestamp = new Date().toISOString();
		return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
	}

	info(message: unknown, ...optionalParams: unknown[]): void {
		console.info(
			logSymbols.info + this.formatMessage("info", message),
			...optionalParams,
		);
	}

	warn(message: unknown, ...optionalParams: unknown[]): void {
		console.warn(
			logSymbols.warning + this.formatMessage("warn", message),
			...optionalParams,
		);
	}

	error(message: unknown, ...optionalParams: unknown[]): void {
		console.error(
			logSymbols.error + this.formatMessage("error", message),
			...optionalParams,
		);
	}

	debug(message: unknown, ...optionalParams: unknown[]): void {
		if (process.env.NODE_ENV === "development") {
			console.debug(
				logSymbols.info + this.formatMessage("debug", message),
				...optionalParams,
			);
		}
	}
}

const logger = new Logger();

export default logger;
