export class ScrapingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ScrapingError";
    }
}
