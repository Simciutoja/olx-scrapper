type LogLevel = "info" | "warn" | "error" | "debug";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

function safeStringify(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		try {
			return String(value);
		} catch {
			return "[unserializable]";
		}
	}
}

class Logger {
	private level: LogLevel;

	constructor() {
		const envLevel = (
			process.env.LOG_LEVEL ||
			(process.env.NODE_ENV === "production" ? "info" : "debug")
		).toLowerCase();
		this.level = (
			["debug", "info", "warn", "error"].includes(envLevel) ? envLevel : "info"
		) as LogLevel;
	}

	info(message: unknown, meta?: Record<string, unknown>): void {
		this.log("info", message, meta);
	}

	warn(message: unknown, meta?: Record<string, unknown>): void {
		this.log("warn", message, meta);
	}

	error(message: unknown, meta?: Record<string, unknown>): void {
		this.log("error", message, meta);
	}

	debug(message: unknown, meta?: Record<string, unknown>): void {
		this.log("debug", message, meta);
	}

	private log(
		level: LogLevel,
		message: unknown,
		meta?: Record<string, unknown>,
	): void {
		if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.level]) return;
		const timestamp = new Date().toISOString();
		const base = {
			timestamp,
			level,
			message: typeof message === "string" ? message : safeStringify(message),
			pid: process.pid,
			env: process.env.NODE_ENV || "development",
			meta: meta || undefined,
		};
		const useJson =
			process.env.LOG_FORMAT === "json" ||
			process.env.NODE_ENV === "production";
		if (useJson) {
			const out = safeStringify(base);
			if (level === "error" || level === "warn") console.error(out);
			else console.log(out);
			return;
		}
		const lvl = level.toUpperCase();
		const metaStr = meta ? ` ${safeStringify(meta)}` : "";
		const formatted = `[${timestamp}] [${lvl}] ${base.message}${metaStr}`;
		if (level === "error") console.error(formatted);
		else if (level === "warn") console.warn(formatted);
		else console.log(formatted);
	}
}

const logger = new Logger();

export default logger;
