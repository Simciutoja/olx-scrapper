import Table from "cli-table3";
import type {Offer} from "../types/schemas";

function formatDate(date: Date): string {
    return date.toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function displayResults(offers: Offer[]): void {
    const table = new Table({
        head: ["Tytuł", "Cena", "Lokalizacja", "Data", "Link"],
        colWidths: [40, 15, 25, 25, 60],
        wordWrap: true,
        style: {
            head: ["cyan"],
            border: ["grey"],
        },
    });

    const sortedOffers = offers.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    sortedOffers.forEach((offer) => {
        table.push([
            offer.title,
            offer.price,
            offer.location.split(" - ")[0],
            formatDate(offer.date),
            offer.url,
        ]);
    });

    console.log(table.toString());
}
