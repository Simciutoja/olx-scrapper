# OLX Scraper

### DISCLAIMER: THIS PROJECT IS FOR EDUCATIONAL PURPOSES ONLY

A Node.js application that scrapes OLX.pl listings using Puppeteer, providing a convenient way to search and monitor offers with a command-line interface.

## Features

- 🔍 Scrapes OLX.pl listings with customizable search parameters
- 📱 Supports both desktop and mobile view configurations
- 📊 Displays results in a clean, formatted table
- 💾 Optional JSON export of search results
- 🔄 Sorting options (newest first, oldest first, or no sorting)
- ⚡ Fast and efficient scraping with Puppeteer
- 🛡️ Built-in error handling and validation

## Prerequisites

- Node.js (latest LTS version recommended)
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Usage

Run the application:

```bash
npm run start
```

The application will prompt you to:
1. Enter an OLX.pl URL to scrape
2. Choose sorting options (if URL doesn't contain sorting parameters)
3. Decide whether to save results to a JSON file

## Configuration

The scraper can be configured through the `constants.ts` file:

- Viewport settings
- Timeout duration
- Headless browser mode
- Custom CSS selectors

## TODO

- [ ] Add support for more websites
- [ ] Implement advanced filtering options
- [ ] Improve error handling and logging
- [ ] Add unit and integration tests
- [ ] Add scheduling for periodic scraping
- [ ] Support for proxy rotation
- [ ] Implement CAPTCHA solving
- [ ] Add a nextjs frontend for better UX
- [ ] Implement hono.js backend for API access

## Project Structure

```
src/
├── config/          # Configuration files
├── errors/         # Custom error definitions
├── scrapers/       # Scraping logic
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Technologies Used

- TypeScript
- Puppeteer
- Zod (for validation)
- cli-table3 (for display formatting)
- ora (for loading spinners)
- prompts (for user input)

## Error Handling

The application includes robust error handling for:
- Invalid URLs
- Network issues
- Scraping failures
- Data validation errors
