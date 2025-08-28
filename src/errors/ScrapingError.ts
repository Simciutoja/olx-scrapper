export class ScrapingError extends Error {
	code?: string;
	context?: Record<string, unknown>;

	constructor(
		message: string,
		options?: { code?: string; context?: Record<string, unknown> },
	) {
		super(message);
		this.name = "ScrapingError";
		if (options?.code) this.code = options.code;
		if (options?.context) this.context = options.context;
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			context: this.context,
		};
	}
}
