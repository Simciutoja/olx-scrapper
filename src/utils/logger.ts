type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
    info(message: unknown, ...optionalParams: unknown[]): void {
        console.info(this.formatMessage("info", message), ...optionalParams);
    }

    warn(message: unknown, ...optionalParams: unknown[]): void {
        console.warn(this.formatMessage("warn", message), ...optionalParams);
    }

    error(message: unknown, ...optionalParams: unknown[]): void {
        console.error(this.formatMessage("error", message), ...optionalParams);
    }

    debug(message: unknown, ...optionalParams: unknown[]): void {
        if (process.env.NODE_ENV === "development") {
            console.debug(this.formatMessage("debug", message), ...optionalParams);
        }
    }

    private formatMessage(level: LogLevel, message: unknown): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }
}

const logger = new Logger();

export default logger;
